import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  approveClientAccount,
  deleteClient,
} from "@/server/services/client.service";
import { NotFoundError } from "@/server/errors";
import {
  cleanupFixture,
  createFixture,
  db,
  hasDatabase,
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
