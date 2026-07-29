import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  cancelAppointment,
  checkAvailability,
  completeAppointment,
  createAppointment,
} from "@/server/services/appointment.service";
import { ConflictError, ValidationError } from "@/server/errors";
import {
  cleanupFixture,
  createFixture,
  db,
  hasDatabase,
  nextWednesdayAt,
  type Fixture,
} from "./setup";

/**
 * A garantia central do sistema: uma profissional não pode estar em dois
 * sítios ao mesmo tempo, contando o tempo de estrada.
 */
describe.skipIf(!hasDatabase)("agenda com deslocação", () => {
  let f: Fixture;

  beforeAll(async () => {
    f = await createFixture("agenda");
  });

  afterAll(async () => {
    await cleanupFixture(f.unitId);
    await db.$disconnect();
  });

  it("marca um atendimento e calcula a hora de partida", async () => {
    const startAt = nextWednesdayAt(10);

    const appointment = await createAppointment(f.owner, {
      clientId: f.clientId,
      professionalId: f.professionalId,
      serviceIds: [f.serviceId],
      startAt,
    });

    expect(appointment.status).toBe("CONFIRMED");
    // 120 min de serviço + 15 de preparação + 5 de arrumação
    expect(appointment.endAt.getTime() - startAt.getTime()).toBe(140 * 60_000);
    // A zona de teste tem 20 min de deslocação
    expect(startAt.getTime() - appointment.departAt.getTime()).toBe(20 * 60_000);
    expect(appointment.travelToMin).toBe(20);
    // €30 de serviço + €5 de deslocação
    expect(appointment.subtotalCents).toBe(3000);
    expect(appointment.travelFeeCents).toBe(500);
    expect(appointment.totalCents).toBe(3500);
  });

  it("recusa uma marcação sobreposta com mensagem que explica porquê", async () => {
    // A primeira ocupa das 10:00 às 12:20.
    const startAt = nextWednesdayAt(11);

    await expect(
      createAppointment(f.owner, {
        clientId: f.clientId,
        professionalId: f.professionalId,
        serviceIds: [f.serviceId],
        startAt,
      }),
    ).rejects.toThrow(ConflictError);
  });

  it("recusa marcação que só é impossível por causa da estrada", async () => {
    // Às 12:30 o atendimento anterior já acabou (12:20), mas com 20 min de
    // deslocação seria preciso sair às 12:10 — quando ainda está em casa da
    // cliente anterior. É este o caso que a agenda de um salão não apanharia.
    const startAt = nextWednesdayAt(12);
    startAt.setUTCMinutes(30);

    const check = await checkAvailability(
      f.professionalId,
      startAt,
      new Date(startAt.getTime() + 140 * 60_000),
      20,
    );

    expect(check.available).toBe(false);
    expect(check.reason).toMatch(/deslocação|Choca/i);
  });

  it("aceita a mesma hora numa profissional diferente", async () => {
    const startAt = nextWednesdayAt(11);

    const appointment = await createAppointment(f.owner, {
      clientId: f.clientId,
      professionalId: f.otherProfessionalId,
      serviceIds: [f.serviceId],
      startAt,
    });

    expect(appointment.professionalId).toBe(f.otherProfessionalId);
  });

  it("recusa marcar no passado", async () => {
    const past = new Date(Date.now() - 86_400_000);

    await expect(
      createAppointment(f.owner, {
        clientId: f.clientId,
        professionalId: f.professionalId,
        serviceIds: [f.serviceId],
        startAt: past,
      }),
    ).rejects.toThrow(ValidationError);
  });

  it("recusa marcação sem serviços", async () => {
    await expect(
      createAppointment(f.owner, {
        clientId: f.clientId,
        professionalId: f.professionalId,
        serviceIds: [],
        startAt: nextWednesdayAt(15),
      }),
    ).rejects.toThrow(/pelo menos um serviço/i);
  });

  it("recusa marcação fora do horário de trabalho", async () => {
    const dawn = nextWednesdayAt(6);

    const check = await checkAvailability(
      f.professionalId,
      dawn,
      new Date(dawn.getTime() + 140 * 60_000),
      20,
    );

    expect(check.available).toBe(false);
    expect(check.reason).toMatch(/horário/i);
  });

  it("classifica sobreposição como HARD e fora de horas como SOFT", async () => {
    // A distinção decide o que a proprietária pode forçar. Trabalhar fora de
    // horas é decisão da casa; estar em dois sítios ao mesmo tempo não é
    // decisão de ninguém — e a constraint da base recusaria de qualquer forma.
    const overlapping = nextWednesdayAt(11);
    const overlap = await checkAvailability(
      f.professionalId,
      overlapping,
      new Date(overlapping.getTime() + 140 * 60_000),
      20,
    );
    expect(overlap.available).toBe(false);
    expect(overlap.severity).toBe("HARD");

    const dawn = nextWednesdayAt(6);
    const outsideHours = await checkAvailability(
      f.professionalId,
      dawn,
      new Date(dawn.getTime() + 140 * 60_000),
      20,
    );
    expect(outsideHours.available).toBe(false);
    expect(outsideHours.severity).toBe("SOFT");
  });

  it("nem a proprietária consegue forçar uma sobreposição física", async () => {
    // A OWNER tem `appointment:override_conflict`, mas isso não a autoriza a
    // pôr alguém em dois sítios ao mesmo tempo.
    await expect(
      createAppointment(f.owner, {
        clientId: f.clientId,
        professionalId: f.professionalId,
        serviceIds: [f.serviceId],
        startAt: nextWednesdayAt(11),
      }),
    ).rejects.toThrow(ConflictError);
  });

  it("recusa marcação ao domingo", async () => {
    const sunday = nextWednesdayAt(10);
    while (sunday.getUTCDay() !== 0) {
      sunday.setUTCDate(sunday.getUTCDate() + 1);
    }

    const check = await checkAvailability(
      f.professionalId,
      sunday,
      new Date(sunday.getTime() + 140 * 60_000),
      20,
    );

    expect(check.available).toBe(false);
    expect(check.reason).toMatch(/não trabalha/i);
  });
});

describe.skipIf(!hasDatabase)("ciclo de vida do atendimento", () => {
  let f: Fixture;

  beforeAll(async () => {
    f = await createFixture("ciclo");
  });

  afterAll(async () => {
    await cleanupFixture(f.unitId);
    await db.$disconnect();
  });

  it("concluir atualiza as métricas da cliente e dá um carimbo", async () => {
    const program = await db.loyaltyProgram.create({
      data: { unitId: f.unitId, stampsRequired: 5 },
    });
    await db.loyaltyCard.create({
      data: {
        programId: program.id,
        clientId: f.clientId,
        stampsCount: 0,
        stampsRequired: 5,
        isActive: true,
      },
    });

    const appointment = await createAppointment(f.owner, {
      clientId: f.clientId,
      professionalId: f.professionalId,
      serviceIds: [f.serviceId],
      startAt: nextWednesdayAt(10),
    });

    await completeAppointment(f.owner, appointment.id);

    const client = await db.client.findUniqueOrThrow({
      where: { id: f.clientId },
    });
    expect(client.visitCount).toBe(1);
    expect(client.status).toBe("ACTIVE");
    expect(client.lifetimeValueCents).toBe(3500);
    expect(client.avgTicketCents).toBe(3500);
    expect(client.lastVisitAt).not.toBeNull();

    const card = await db.loyaltyCard.findFirstOrThrow({
      where: { clientId: f.clientId, isActive: true },
    });
    expect(card.stampsCount).toBe(1);
  });

  it("não deixa concluir duas vezes", async () => {
    const appointment = await createAppointment(f.owner, {
      clientId: f.clientId,
      professionalId: f.otherProfessionalId,
      serviceIds: [f.serviceId],
      startAt: nextWednesdayAt(14),
    });

    await completeAppointment(f.owner, appointment.id);

    await expect(
      completeAppointment(f.owner, appointment.id),
    ).rejects.toThrow(/já está concluído/i);
  });

  it("cancelar exige motivo e incrementa o contador da cliente", async () => {
    const appointment = await createAppointment(f.owner, {
      clientId: f.clientId,
      professionalId: f.professionalId,
      serviceIds: [f.serviceId],
      startAt: nextWednesdayAt(16),
    });

    await expect(
      cancelAppointment(f.owner, appointment.id, "   "),
    ).rejects.toThrow(/motivo/i);

    const before = await db.client.findUniqueOrThrow({
      where: { id: f.clientId },
      select: { cancelCount: true },
    });

    await cancelAppointment(f.owner, appointment.id, "A cliente adoeceu");

    const after = await db.client.findUniqueOrThrow({
      where: { id: f.clientId },
      select: { cancelCount: true },
    });
    expect(after.cancelCount).toBe(before.cancelCount + 1);

    const cancelled = await db.appointment.findUniqueOrThrow({
      where: { id: appointment.id },
    });
    expect(cancelled.status).toBe("CANCELLED");
    expect(cancelled.cancelReason).toBe("A cliente adoeceu");
  });

  it("uma marcação cancelada liberta o horário", async () => {
    const startAt = nextWednesdayAt(16);

    // O horário das 16:00 foi cancelado no teste anterior, por isso volta a
    // estar livre. Sem isto, um cancelamento deixaria o slot bloqueado para
    // sempre — um erro caro num negócio que vive da agenda.
    const appointment = await createAppointment(f.owner, {
      clientId: f.clientId,
      professionalId: f.professionalId,
      serviceIds: [f.serviceId],
      startAt,
    });

    expect(appointment.status).toBe("CONFIRMED");
  });
});

describe.skipIf(!hasDatabase)("auditoria", () => {
  let f: Fixture;

  beforeAll(async () => {
    f = await createFixture("audit");
  });

  afterAll(async () => {
    await cleanupFixture(f.unitId);
    await db.$disconnect();
  });

  it("cada marcação deixa rasto no AuditLog", async () => {
    const appointment = await createAppointment(f.owner, {
      clientId: f.clientId,
      professionalId: f.professionalId,
      serviceIds: [f.serviceId],
      startAt: nextWednesdayAt(10),
    });

    const log = await db.auditLog.findFirst({
      where: { entityType: "Appointment", entityId: appointment.id },
    });

    expect(log).not.toBeNull();
    expect(log?.action).toBe("CREATE");
    expect(log?.userId).toBe(f.ownerUserId);
  });

  it("o AuditLog não pode ser alterado nem apagado", async () => {
    const log = await db.auditLog.findFirstOrThrow({
      where: { unitId: f.unitId },
    });

    await expect(
      db.auditLog.update({
        where: { id: log.id },
        data: { action: "DELETE" },
      }),
    ).rejects.toThrow();

    await expect(
      db.auditLog.delete({ where: { id: log.id } }),
    ).rejects.toThrow();
  });
});
