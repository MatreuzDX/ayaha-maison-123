import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createAppointment,
  listUpcomingReminders,
} from "@/server/services/appointment.service";
import {
  cleanupFixture,
  createFixture,
  db,
  hasDatabase,
  type Fixture,
} from "./setup";

/**
 * Lembretes de atendimento — 48h, 24h e 2h antes.
 *
 * Mesma filosofia dos testes de retoque em client.spec.ts: confirma que a
 * janela certa apanha a marcação certa, que marcações fora das três janelas
 * não aparecem, e que só CONFIRMED conta (REQUESTED ainda não tem nada para
 * confirmar à cliente).
 */
describe.skipIf(!hasDatabase)("lembretes de atendimento", () => {
  let f: Fixture;

  beforeAll(async () => {
    f = await createFixture("lembretes");
  });

  afterAll(async () => {
    await cleanupFixture(f.unitId);
    await db.$disconnect();
  });

  /** Marca uma sessão daqui a N horas. O dono pode forçar fora do horário
   *  de trabalho — o que interessa aqui é só a distância no tempo. */
  async function marcarDaquiA(horas: number) {
    const startAt = new Date(Date.now() + horas * 3_600_000);
    return createAppointment(f.owner, {
      clientId: f.clientId,
      professionalId: f.professionalId,
      serviceIds: [f.serviceId],
      startAt,
    });
  }

  it("apanha uma marcação na janela das 48h", async () => {
    const a = await marcarDaquiA(48);
    const lista = await listUpcomingReminders(f.owner);

    const encontrada = lista.find((r) => r.appointmentId === a.id);
    expect(encontrada).toBeDefined();
    expect(encontrada!.window).toBe("48h");

    await db.appointment.delete({ where: { id: a.id } });
  });

  it("apanha uma marcação na janela das 24h", async () => {
    const a = await marcarDaquiA(24);
    const lista = await listUpcomingReminders(f.owner);

    const encontrada = lista.find((r) => r.appointmentId === a.id);
    expect(encontrada).toBeDefined();
    expect(encontrada!.window).toBe("24h");

    await db.appointment.delete({ where: { id: a.id } });
  });

  it("apanha uma marcação na janela das 2h", async () => {
    const a = await marcarDaquiA(2);
    const lista = await listUpcomingReminders(f.owner);

    const encontrada = lista.find((r) => r.appointmentId === a.id);
    expect(encontrada).toBeDefined();
    expect(encontrada!.window).toBe("2h");

    await db.appointment.delete({ where: { id: a.id } });
  });

  it("não mostra uma marcação entre janelas", async () => {
    // 10h não está perto de nenhuma das três janelas (48h/24h/2h) — não há
    // nada a fazer agora, mas também não é tarde para agir mais perto.
    const a = await marcarDaquiA(10);
    const lista = await listUpcomingReminders(f.owner);

    expect(lista.find((r) => r.appointmentId === a.id)).toBeUndefined();

    await db.appointment.delete({ where: { id: a.id } });
  });

  it("não mostra uma marcação muito distante", async () => {
    const a = await marcarDaquiA(24 * 10); // daqui a 10 dias
    const lista = await listUpcomingReminders(f.owner);

    expect(lista.find((r) => r.appointmentId === a.id)).toBeUndefined();

    await db.appointment.delete({ where: { id: a.id } });
  });

  it("não mostra uma marcação ainda só REQUESTED", async () => {
    // Uma marcação pedida pela cliente em /conta/marcar, ainda por
    // confirmar pela equipa — lembrar antes de confirmar seria prometer
    // um horário que pode nem se realizar.
    const startAt = new Date(Date.now() + 24 * 3_600_000);
    const pedida = await db.appointment.create({
      data: {
        unitId: f.unitId,
        code: `TESTE-${Date.now()}`,
        clientId: f.clientId,
        professionalId: f.professionalId,
        status: "REQUESTED",
        startAt,
        endAt: new Date(startAt.getTime() + 90 * 60_000),
        departAt: startAt,
        source: "ONLINE",
      },
    });

    const lista = await listUpcomingReminders(f.owner);
    expect(
      lista.find((r) => r.appointmentId === pedida.id),
    ).toBeUndefined();

    await db.appointment.delete({ where: { id: pedida.id } });
  });

  it("não mostra uma marcação cancelada dentro da janela", async () => {
    const a = await marcarDaquiA(24);
    await db.appointment.update({
      where: { id: a.id },
      data: { status: "CANCELLED", cancelledAt: new Date() },
    });

    const lista = await listUpcomingReminders(f.owner);
    expect(lista.find((r) => r.appointmentId === a.id)).toBeUndefined();

    await db.appointment.delete({ where: { id: a.id } });
  });
});
