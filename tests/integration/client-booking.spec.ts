import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  listAvailableSlots,
  listBookableProfessionals,
  requestAppointment,
} from "@/server/client-booking";
import { createAppointment } from "@/server/services/appointment.service";
import { ConflictError, ValidationError } from "@/server/errors";
import type { ClientSessionInfo } from "@/server/client-auth";
import {
  cleanupFixture,
  createFixture,
  db,
  hasDatabase,
  nextWednesdayAt,
  type Fixture,
} from "./setup";

/**
 * Auto-marcação: a cliente marca sozinha em `/conta/marcar`.
 *
 * O que estes testes protegem, por ordem de importância:
 *   1. Ninguém marca em nome de outra pessoa — o `clientId` vem da sessão.
 *   2. Conta por aprovar não marca.
 *   3. Horário ocupado é recusado, mesmo que enviado à força.
 *   4. O que a cliente cria fica em REQUESTED, nunca CONFIRMED.
 */
describe.skipIf(!hasDatabase)("auto-marcação da cliente", () => {
  let f: Fixture;

  /** Sessão de cliente aprovada, como a que `getClientSession` devolveria. */
  function sessao(
    overrides: Partial<ClientSessionInfo> = {},
  ): ClientSessionInfo {
    return {
      clientId: f.clientId,
      accountId: "conta-de-teste",
      unitId: f.unitId,
      name: "Marta",
      approved: true,
      ...overrides,
    };
  }

  beforeAll(async () => {
    f = await createFixture("auto-marcacao");
  });

  afterAll(async () => {
    await cleanupFixture(f.unitId);
    await db.$disconnect();
  });

  it("cria o pedido em REQUESTED, não CONFIRMED", async () => {
    const startAt = nextWednesdayAt(10);

    const created = await requestAppointment(sessao(), {
      serviceId: f.serviceId,
      professionalId: f.professionalId,
      startAt: startAt.toISOString(),
    });

    // A equipa é que confirma — este é o ponto central da funcionalidade.
    expect(created.status).toBe("REQUESTED");
    expect(created.clientId).toBe(f.clientId);
    expect(created.source).toBe("ONLINE");
    // Não foi ninguém da equipa a criar.
    expect(created.createdById).toBeNull();

    await db.appointment.delete({ where: { id: created.id } });
  });

  it("recusa se a conta ainda não estiver aprovada", async () => {
    await expect(
      requestAppointment(sessao({ approved: false }), {
        serviceId: f.serviceId,
        professionalId: f.professionalId,
        startAt: nextWednesdayAt(11).toISOString(),
      }),
    ).rejects.toThrow(ValidationError);
  });

  it("recusa um horário já ocupado", async () => {
    const startAt = nextWednesdayAt(14);

    // A equipa marca primeiro, pelo caminho normal.
    const daEquipa = await createAppointment(f.owner, {
      clientId: f.clientId,
      professionalId: f.professionalId,
      serviceIds: [f.serviceId],
      startAt,
    });

    // A cliente tenta a mesma hora — enviada à força, saltando a lista de
    // horas livres que a página mostraria.
    await expect(
      requestAppointment(sessao(), {
        serviceId: f.serviceId,
        professionalId: f.professionalId,
        startAt: startAt.toISOString(),
      }),
    ).rejects.toThrow(ConflictError);

    await db.appointment.delete({ where: { id: daEquipa.id } });
  });

  it("nunca marca em nome de outra cliente", async () => {
    const outra = await db.client.create({
      data: {
        unitId: f.unitId,
        firstName: "Outra",
        phone: `+3519${String(Date.now()).slice(-8)}`,
        status: "ACTIVE",
      },
    });

    const startAt = nextWednesdayAt(16);

    // Mesmo que o pedido fosse adulterado para apontar a outra ficha, a
    // função só olha para a sessão — o `clientId` nem sequer é um parâmetro.
    const created = await requestAppointment(sessao(), {
      serviceId: f.serviceId,
      professionalId: f.professionalId,
      startAt: startAt.toISOString(),
      ...({ clientId: outra.id } as Record<string, unknown>),
    });

    expect(created.clientId).toBe(f.clientId);
    expect(created.clientId).not.toBe(outra.id);

    await db.appointment.delete({ where: { id: created.id } });
  });

  it("recusa marcar no passado ou sem antecedência", async () => {
    await expect(
      requestAppointment(sessao(), {
        serviceId: f.serviceId,
        professionalId: f.professionalId,
        startAt: new Date(Date.now() + 3_600_000).toISOString(),
      }),
    ).rejects.toThrow(ValidationError);
  });

  it("recusa uma profissional que não faz aquele serviço", async () => {
    const semCompetencia = await db.professional.create({
      data: {
        unitId: f.unitId,
        userId: (
          await db.user.create({
            data: { email: `sem-skill-${Date.now()}@teste.pt`, name: "Sem" },
          })
        ).id,
        displayName: "Sem competência",
      },
    });

    await expect(
      requestAppointment(sessao(), {
        serviceId: f.serviceId,
        professionalId: semCompetencia.id,
        startAt: nextWednesdayAt(17).toISOString(),
      }),
    ).rejects.toThrow(ValidationError);
  });

  it("só oferece profissionais que fazem o serviço escolhido", async () => {
    const profs = await listBookableProfessionals(f.unitId, f.serviceId);
    const ids = profs.map((p) => p.id);

    expect(ids).toContain(f.professionalId);
    expect(ids).toContain(f.otherProfessionalId);
    // A que criámos sem competência não pode aparecer.
    expect(profs.every((p) => p.displayName !== "Sem competência")).toBe(true);
  });

  it("as horas oferecidas excluem as que já estão ocupadas", async () => {
    const startAt = nextWednesdayAt(10);
    const dia = startAt.toISOString().slice(0, 10);

    const antes = await listAvailableSlots({
      unitId: f.unitId,
      clientId: f.clientId,
      professionalId: f.professionalId,
      serviceId: f.serviceId,
      day: dia,
    });
    expect(antes).toContain(startAt.toISOString());

    const ocupado = await createAppointment(f.owner, {
      clientId: f.clientId,
      professionalId: f.professionalId,
      serviceIds: [f.serviceId],
      startAt,
    });

    const depois = await listAvailableSlots({
      unitId: f.unitId,
      clientId: f.clientId,
      professionalId: f.professionalId,
      serviceId: f.serviceId,
      day: dia,
    });
    expect(depois).not.toContain(startAt.toISOString());

    await db.appointment.delete({ where: { id: ocupado.id } });
  });
});
