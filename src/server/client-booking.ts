/**
 * Auto-marcação — a cliente marca sozinha, a partir de `/marcar`.
 *
 * Ficheiro à parte de `services/appointment.service.ts` pela mesma razão que
 * `client-auth.ts` está à parte de `auth.ts`: são domínios de confiança
 * diferentes. Aqui nunca existe um `Actor` de equipa; entra sempre a sessão
 * da cliente, e o `clientId` vem da sessão — nunca de um formulário. Isso
 * sozinho já impede alguém de marcar em nome de outra pessoa, por muito que
 * mexa no que envia.
 *
 * Uma marcação feita aqui nasce em `REQUESTED`, não `CONFIRMED`. A cliente
 * escolhe um horário livre, mas quem confirma é a equipa — é ela que sabe
 * se consegue mesmo lá chegar naquele dia.
 */

import { prisma } from "./db";
import { recordAudit } from "./audit";
import { recordTimeline } from "./timeline";
import { ConflictError, NotFoundError, ValidationError } from "./errors";
import {
  checkAvailability,
  estimateTravelMinutes,
  travelFeeFor,
} from "./services/appointment.service";
import type { ClientSessionInfo } from "./client-auth";
import { appointmentCode } from "@/lib/format";
import { formatDateTime, lisbonWeekday } from "@/lib/datetime";
import { sumCents } from "@/lib/money";

/** De quantos em quantos minutos se oferecem horas. */
const SLOT_STEP_MIN = 30;

/** Quantos dias para a frente a cliente pode marcar. */
export const BOOKING_HORIZON_DAYS = 30;

/**
 * Antecedência mínima. Marcar para daqui a dez minutos não é realista para
 * um serviço ao domicílio — a profissional ainda tem de se deslocar.
 */
const MIN_NOTICE_HOURS = 12;

export interface BookableService {
  id: string;
  name: string;
  durationMin: number;
  priceCents: number;
}

export interface BookableProfessional {
  id: string;
  displayName: string;
}

export async function listBookableServices(
  unitId: string,
): Promise<BookableService[]> {
  const services = await prisma.service.findMany({
    where: { unitId, isActive: true, deletedAt: null },
    orderBy: { sortOrder: "asc" },
    select: { id: true, name: true, durationMin: true, priceCents: true },
  });
  return services;
}

/**
 * Profissionais que fazem este serviço e aceitam marcações.
 *
 * Filtra por competência (`ProfessionalSkill`) de propósito: oferecer uma
 * profissional que não faz aquela técnica seria empurrar a cliente para uma
 * recusa depois de já ter escolhido tudo.
 */
export async function listBookableProfessionals(
  unitId: string,
  serviceId: string,
): Promise<BookableProfessional[]> {
  const professionals = await prisma.professional.findMany({
    where: {
      unitId,
      deletedAt: null,
      isBookable: true,
      skills: { some: { serviceId } },
    },
    orderBy: { displayName: "asc" },
    select: { id: true, displayName: true },
  });
  return professionals;
}

/** Duração total da visita, incluindo preparação e arrumação. */
async function visitMinutes(unitId: string, serviceId: string) {
  const service = await prisma.service.findFirst({
    where: { unitId, id: serviceId, isActive: true, deletedAt: null },
  });
  if (!service) throw new NotFoundError("Serviço");

  return {
    service,
    totalMinutes: service.durationMin + service.setupMin + service.teardownMin,
  };
}

/**
 * Horas livres num dia, para uma profissional e um serviço.
 *
 * Gera as horas possíveis a partir do horário de trabalho e deixa passar só
 * as que `checkAvailability` aceita — a mesma função que a equipa usa. Sem
 * isso, o site oferecia horas que a agenda depois recusava.
 */
export async function listAvailableSlots(input: {
  unitId: string;
  clientId: string;
  professionalId: string;
  serviceId: string;
  /** Dia em `YYYY-MM-DD`. */
  day: string;
}): Promise<string[]> {
  const { totalMinutes } = await visitMinutes(input.unitId, input.serviceId);

  const dayStart = new Date(`${input.day}T00:00:00.000Z`);
  if (Number.isNaN(dayStart.getTime())) {
    throw new ValidationError("Dia inválido.");
  }

  const weekday = lisbonWeekday(dayStart);
  const hours = await prisma.workingHour.findMany({
    where: { professionalId: input.professionalId, weekday },
  });
  if (hours.length === 0) return [];

  const travelToMin = await estimateTravelMinutes(input.unitId, input.clientId);
  const earliest = new Date(Date.now() + MIN_NOTICE_HOURS * 3_600_000);

  const slots: string[] = [];

  for (const block of hours) {
    for (
      let minute = block.startMin;
      minute + totalMinutes <= block.endMin;
      minute += SLOT_STEP_MIN
    ) {
      const startAt = new Date(dayStart.getTime() + minute * 60_000);
      if (startAt < earliest) continue;

      const endAt = new Date(startAt.getTime() + totalMinutes * 60_000);
      const availability = await checkAvailability(
        input.professionalId,
        startAt,
        endAt,
        travelToMin,
      );
      if (availability.available) slots.push(startAt.toISOString());
    }
  }

  return slots;
}

export interface BookingRequest {
  serviceId: string;
  professionalId: string;
  /** ISO da hora escolhida. */
  startAt: string;
  notes?: string;
}

/**
 * Cria o pedido de marcação da cliente.
 *
 * Repete todas as verificações do lado do servidor — a página já filtra as
 * horas, mas quem envia o pedido pode enviar o que quiser, e é aqui que isso
 * é travado.
 */
export async function requestAppointment(
  session: ClientSessionInfo,
  input: BookingRequest,
) {
  if (!session.approved) {
    throw new ValidationError(
      "A sua conta ainda está a aguardar aprovação da equipa.",
    );
  }

  const startAt = new Date(input.startAt);
  if (Number.isNaN(startAt.getTime())) {
    throw new ValidationError("Hora inválida.");
  }
  if (startAt < new Date(Date.now() + MIN_NOTICE_HOURS * 3_600_000)) {
    throw new ValidationError(
      `As marcações precisam de pelo menos ${MIN_NOTICE_HOURS} horas de antecedência. Para hoje ou amanhã cedo, fale connosco pelo WhatsApp.`,
    );
  }
  const horizon = new Date(Date.now() + BOOKING_HORIZON_DAYS * 86_400_000);
  if (startAt > horizon) {
    throw new ValidationError(
      `Só é possível marcar até ${BOOKING_HORIZON_DAYS} dias de antecedência.`,
    );
  }

  // O clientId vem SEMPRE da sessão, nunca do formulário.
  const client = await prisma.client.findFirst({
    where: { unitId: session.unitId, id: session.clientId, deletedAt: null },
    select: { id: true, firstName: true, status: true },
  });
  if (!client) throw new NotFoundError("Cliente");
  if (client.status === "BLOCKED") {
    throw new ValidationError(
      "Não é possível marcar online. Fale connosco pelo WhatsApp.",
    );
  }

  const professional = await prisma.professional.findFirst({
    where: {
      unitId: session.unitId,
      id: input.professionalId,
      deletedAt: null,
      isBookable: true,
      skills: { some: { serviceId: input.serviceId } },
    },
    select: { id: true, displayName: true },
  });
  if (!professional) {
    throw new ValidationError(
      "Esta profissional não faz este serviço ou não está disponível.",
    );
  }

  const { service, totalMinutes } = await visitMinutes(
    session.unitId,
    input.serviceId,
  );
  const endAt = new Date(startAt.getTime() + totalMinutes * 60_000);

  const travelToMin = await estimateTravelMinutes(session.unitId, client.id);
  const departAt = new Date(startAt.getTime() - travelToMin * 60_000);

  const subtotalCents = service.priceCents;
  const travelFeeCents = await travelFeeFor(
    session.unitId,
    client.id,
    subtotalCents,
  );
  const totalCents = sumCents(subtotalCents, travelFeeCents);

  const availability = await checkAvailability(
    professional.id,
    startAt,
    endAt,
    travelToMin,
  );
  if (!availability.available) {
    // Ao contrário da equipa, a cliente nunca pode passar por cima de um
    // conflito — nem de um SOFT. Não tem como saber se a profissional
    // consegue mesmo encaixar.
    throw new ConflictError(
      "APPOINTMENT_CONFLICT",
      "Esse horário deixou de estar livre. Escolha outro, por favor.",
    );
  }

  return prisma.$transaction(async (tx) => {
    const created = await tx.appointment.create({
      data: {
        unitId: session.unitId,
        code: appointmentCode(startAt),
        clientId: client.id,
        professionalId: professional.id,
        // Pedida, não confirmada — quem confirma é a equipa.
        status: "REQUESTED",
        startAt,
        endAt,
        departAt,
        travelToMin,
        travelFeeCents,
        subtotalCents,
        totalCents,
        clientNotes: input.notes?.trim() || null,
        // Sem `createdById`: não foi ninguém da equipa que criou.
        source: "ONLINE",
        items: {
          create: [
            {
              serviceId: service.id,
              nameSnapshot: service.name,
              durationMin: service.durationMin,
              unitPriceCents: service.priceCents,
              quantity: 1,
              totalCents: service.priceCents,
              commissionBps: service.commissionBps,
            },
          ],
        },
      },
      include: { items: true },
    });

    await tx.appointmentStatusChange.create({
      data: {
        appointmentId: created.id,
        fromStatus: null,
        toStatus: "REQUESTED",
      },
    });

    // Auditoria e histórico sem `actor` — foi a própria cliente.
    // Sem utilizador de equipa: foi a própria cliente, a partir do site.
    await recordAudit(
      tx,
      { userId: null, unitId: session.unitId },
      {
        action: "CREATE",
        entityType: "Appointment",
        entityId: created.id,
        after: created,
      },
    );

    await recordTimeline(
      tx,
      { userId: null, unitId: session.unitId },
      {
        clientId: client.id,
        entityType: "Appointment",
        entityId: created.id,
        type: "APPOINTMENT_BOOKED",
        title: `Pedido de marcação para ${formatDateTime(startAt)}`,
        body: `${service.name} · ${professional.displayName} · pedido pela cliente no site`,
        occurredAt: new Date(),
      },
    );

    return created;
  });
}
