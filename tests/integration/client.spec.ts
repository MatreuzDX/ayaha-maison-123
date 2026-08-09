import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  approveClientAccount,
  deleteClient,
  listRetouchDue,
} from "@/server/services/client.service";
import { createAppointment } from "@/server/services/appointment.service";
import { NotFoundError } from "@/server/errors";
import {
  cleanupFixture,
  createFixture,
  db,
  hasDatabase,
  nextWednesdayAt,
  type Fixture,
} from "./setup";

/**
 * Apagar uma ficha de cliente tem de libertar o e-mail da conta de acesso —
 * senão a cliente nunca mais consegue criar conta nova com o mesmo e-mail,
 * mesmo depois de a ficha ter "desaparecido" das listas da equipa.
 */
describe.skipIf(!hasDatabase)("apagar cliente", () => {
  let f: Fixture;

  beforeAll(async () => {
    f = await createFixture("apagar-cliente");
  });

  afterAll(async () => {
    await cleanupFixture(f.unitId);
    await db.$disconnect();
  });

  it("apaga a conta de acesso ao portal junto com a ficha", async () => {
    const email = `cliente-teste-${Date.now()}@teste.pt`;

    await db.clientAccount.create({
      data: { clientId: f.clientId, email, passwordHash: "hash-de-teste" },
    });

    await deleteClient(f.owner, f.clientId);

    const client = await db.client.findUniqueOrThrow({
      where: { id: f.clientId },
    });
    expect(client.deletedAt).not.toBeNull();

    const account = await db.clientAccount.findUnique({
      where: { clientId: f.clientId },
    });
    expect(account).toBeNull();

    // O e-mail tem de voltar a estar livre — é exatamente isto que falhava
    // antes da correção: a constraint `@unique` em `email` recusava uma
    // segunda conta enquanto a primeira continuasse por apagar.
    const newClient = await db.client.create({
      data: {
        unitId: f.unitId,
        firstName: "Marta",
        phone: `+3519${String(Date.now()).slice(-8)}`,
        status: "LEAD",
      },
    });
    const newAccount = await db.clientAccount.create({
      data: { clientId: newClient.id, email, passwordHash: "outra-hash" },
    });
    expect(newAccount.email).toBe(email);
  });
});

describe.skipIf(!hasDatabase)("aprovar conta de cliente", () => {
  let f: Fixture;

  beforeAll(async () => {
    f = await createFixture("aprovar-conta");
  });

  afterAll(async () => {
    await cleanupFixture(f.unitId);
    await db.$disconnect();
  });

  it("aprova uma conta pendente", async () => {
    const account = await db.clientAccount.create({
      data: {
        clientId: f.clientId,
        email: `pendente-${Date.now()}@teste.pt`,
        passwordHash: "hash-de-teste",
        approvedAt: null,
      },
    });

    const approved = await approveClientAccount(f.owner, f.clientId);
    expect(approved.approvedAt).not.toBeNull();

    const reloaded = await db.clientAccount.findUniqueOrThrow({
      where: { id: account.id },
    });
    expect(reloaded.approvedAt).not.toBeNull();
  });

  it("é idempotente numa conta já aprovada", async () => {
    const firstApprovedAt = (await approveClientAccount(f.owner, f.clientId))
      .approvedAt;
    const secondApprovedAt = (await approveClientAccount(f.owner, f.clientId))
      .approvedAt;
    expect(secondApprovedAt).toEqual(firstApprovedAt);
  });

  it("recusa quando a ficha não tem conta de acesso", async () => {
    const client = await db.client.create({
      data: {
        unitId: f.unitId,
        firstName: "Sem Conta",
        phone: `+3519${String(Date.now()).slice(-8)}`,
        status: "LEAD",
      },
    });

    await expect(approveClientAccount(f.owner, client.id)).rejects.toThrow(
      NotFoundError,
    );
  });
});

describe.skipIf(!hasDatabase)("retoques a fazer", () => {
  let f: Fixture;

  beforeAll(async () => {
    f = await createFixture("retoques");
  });

  afterAll(async () => {
    await cleanupFixture(f.unitId);
    await db.$disconnect();
  });

  /** Põe a última visita da cliente a N dias atrás. */
  async function ultimaVisitaHa(dias: number) {
    await db.client.update({
      where: { id: f.clientId },
      data: { lastVisitAt: new Date(Date.now() - dias * 86_400_000) },
    });
  }

  it("mostra quem passou da janela de manutenção", async () => {
    await ultimaVisitaHa(25);

    const lista = await listRetouchDue(f.owner);
    const eu = lista.find((c) => c.clientId === f.clientId);

    expect(eu).toBeDefined();
    expect(eu!.daysSince).toBe(25);
  });

  it("não mostra quem ainda está dentro da janela", async () => {
    // 10 dias é cedo de mais — os cílios ainda estão bons.
    await ultimaVisitaHa(10);

    const lista = await listRetouchDue(f.owner);
    expect(lista.find((c) => c.clientId === f.clientId)).toBeUndefined();
  });

  it("não mostra quem já está em risco (mais de 45 dias)", async () => {
    // Passados 45 dias é outro problema, com outro tratamento — não se
    // deve mandar "está na altura do retoque" a quem desapareceu há meses.
    await ultimaVisitaHa(60);

    const lista = await listRetouchDue(f.owner);
    expect(lista.find((c) => c.clientId === f.clientId)).toBeUndefined();
  });

  it("não mostra quem já tem a próxima marcação feita", async () => {
    await ultimaVisitaHa(25);

    // Confirma que apareceria, se não tivesse marcação.
    expect(
      (await listRetouchDue(f.owner)).find((c) => c.clientId === f.clientId),
    ).toBeDefined();

    const marcada = await createAppointment(f.owner, {
      clientId: f.clientId,
      professionalId: f.professionalId,
      serviceIds: [f.serviceId],
      startAt: nextWednesdayAt(10),
    });

    // Agora não há nada a lembrar — ela já vem cá.
    expect(
      (await listRetouchDue(f.owner)).find((c) => c.clientId === f.clientId),
    ).toBeUndefined();

    await db.appointment.delete({ where: { id: marcada.id } });
  });

  it("não mostra clientes bloqueadas", async () => {
    await ultimaVisitaHa(25);
    await db.client.update({
      where: { id: f.clientId },
      data: { status: "BLOCKED" },
    });

    const lista = await listRetouchDue(f.owner);
    expect(lista.find((c) => c.clientId === f.clientId)).toBeUndefined();

    await db.client.update({
      where: { id: f.clientId },
      data: { status: "ACTIVE" },
    });
  });
});
