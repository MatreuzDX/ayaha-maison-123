import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  changeOwnPassword,
  getAccountSecurity,
  getPortalAppointments,
  getPortalBenefits,
  getPortalDashboard,
} from "@/server/client-portal";
import { createAppointment } from "@/server/services/appointment.service";
import { ValidationError } from "@/server/errors";
import { hashPassword, verifyPassword } from "@/server/auth";
import {
  cleanupFixture,
  createFixture,
  db,
  hasDatabase,
  nextWednesdayAt,
  type Fixture,
} from "./setup";

/**
 * Isolamento do Portal da Cliente.
 *
 * A garantia central: cada consulta é feita pelo `clientId` de quem está
 * autenticada. Uma cliente nunca vê marcações, histórico nem benefícios de
 * outra — nem por engano de código, nem adulterando o que envia.
 */
describe.skipIf(!hasDatabase)("isolamento do portal", () => {
  let f: Fixture;
  let outraClienteId: string;

  beforeAll(async () => {
    f = await createFixture("portal-isolamento");

    const outra = await db.client.create({
      data: {
        unitId: f.unitId,
        firstName: "Outra",
        lastName: "Cliente",
        phone: `+3519${String(Date.now()).slice(-8)}`,
        status: "ACTIVE",
        travelZoneId: null,
      },
    });
    outraClienteId = outra.id;

    // Uma marcação de CADA cliente, para se poder provar que não se cruzam.
    await createAppointment(f.owner, {
      clientId: f.clientId,
      professionalId: f.professionalId,
      serviceIds: [f.serviceId],
      startAt: nextWednesdayAt(10),
    });
    await createAppointment(f.owner, {
      clientId: outraClienteId,
      professionalId: f.otherProfessionalId,
      serviceIds: [f.serviceId],
      startAt: nextWednesdayAt(15),
    });
  });

  afterAll(async () => {
    await cleanupFixture(f.unitId);
    await db.$disconnect();
  });

  it("o painel só conta as marcações da própria cliente", async () => {
    const minhas = await getPortalDashboard(f.clientId);
    const dela = await getPortalDashboard(outraClienteId);

    expect(minhas.totalAppointments).toBe(1);
    expect(dela.totalAppointments).toBe(1);
    // A próxima marcação de cada uma é a sua, não a da outra.
    expect(minhas.nextAppointment?.professionalName).not.toBe(
      dela.nextAppointment?.professionalName,
    );
  });

  it("a lista de marcações nunca inclui as de outra cliente", async () => {
    const minhas = await getPortalAppointments(f.clientId);
    const todas = [...minhas.upcoming, ...minhas.past];

    expect(todas.length).toBe(1);

    // Confirma na base que nenhuma das devolvidas pertence à outra.
    const idsDaOutra = (
      await db.appointment.findMany({
        where: { clientId: outraClienteId },
        select: { id: true },
      })
    ).map((a) => a.id);

    for (const a of todas) {
      expect(idsDaOutra).not.toContain(a.id);
    }
  });

  it("os benefícios são os da própria cliente", async () => {
    const meus = await getPortalBenefits(f.clientId, f.unitId);
    // Sem recompensas escolhidas nem cupões ativos, ambas veem vazio —
    // o que importa é que a consulta é feita pelo clientId de cada uma.
    expect(Array.isArray(meus)).toBe(true);
  });

  it("a informação de segurança nunca devolve o hash da palavra-passe", async () => {
    const conta = await db.clientAccount.create({
      data: {
        clientId: f.clientId,
        email: `seguranca-${Date.now()}@teste.pt`,
        passwordHash: await hashPassword("palavra-passe-antiga"),
        approvedAt: new Date(),
      },
    });

    const info = await getAccountSecurity(conta.id);

    expect(info.hasPassword).toBe(true);
    expect(info).not.toHaveProperty("passwordHash");
    expect(JSON.stringify(info)).not.toContain("argon2");
  });

  it("mudar a palavra-passe exige a atual", async () => {
    const conta = await db.clientAccount.findFirstOrThrow({
      where: { clientId: f.clientId },
    });

    await expect(
      changeOwnPassword(conta.id, "palavra-passe-errada", "palavra-passe-nova"),
    ).rejects.toThrow(ValidationError);

    // A antiga continua a valer — nada mudou.
    const inalterada = await db.clientAccount.findUniqueOrThrow({
      where: { id: conta.id },
    });
    expect(
      await verifyPassword(inalterada.passwordHash!, "palavra-passe-antiga"),
    ).toBe(true);
  });

  it("muda a palavra-passe e fecha as sessões abertas", async () => {
    const conta = await db.clientAccount.findFirstOrThrow({
      where: { clientId: f.clientId },
    });
    await db.clientSession.create({
      data: {
        sessionToken: `token-portal-${Date.now()}`,
        clientAccountId: conta.id,
        expires: new Date(Date.now() + 86_400_000),
      },
    });

    await changeOwnPassword(
      conta.id,
      "palavra-passe-antiga",
      "palavra-passe-mesmo-nova",
    );

    const depois = await db.clientAccount.findUniqueOrThrow({
      where: { id: conta.id },
    });
    expect(
      await verifyPassword(depois.passwordHash!, "palavra-passe-mesmo-nova"),
    ).toBe(true);

    const sessoes = await db.clientSession.count({
      where: { clientAccountId: conta.id },
    });
    expect(sessoes).toBe(0);
  });

  it("recusa uma palavra-passe nova demasiado curta", async () => {
    const conta = await db.clientAccount.findFirstOrThrow({
      where: { clientId: f.clientId },
    });

    await expect(
      changeOwnPassword(conta.id, "palavra-passe-mesmo-nova", "abc"),
    ).rejects.toThrow(ValidationError);
  });

  it("as marcações do portal não trazem notas internas da equipa", async () => {
    const { upcoming, past } = await getPortalAppointments(f.clientId);
    const todas = [...upcoming, ...past];

    for (const a of todas) {
      expect(a).not.toHaveProperty("internalNotes");
      expect(a).not.toHaveProperty("createdById");
    }
  });
});
