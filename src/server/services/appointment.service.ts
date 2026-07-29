/**
 * Agenda e deslocação. Ver especificação secções 12 e 13.
 *
 * Este é o módulo mais delicado do sistema, porque a AYAHA trabalha
 * exclusivamente ao domicílio. Duas marcações que no papel não se sobrepõem
 * podem ser fisicamente impossíveis: 10:00 em Benfica e 11:45 em Cascais não
 * colidem no relógio, mas colidem na estrada.
 *
 * A defesa é o campo `departAt` — a hora a que a profissional tem de sair para
 * chegar a tempo. A constraint SQL `appointment_no_overlap` exclui intervalos
 * `[departAt, endAt)` sobrepostos para a mesma profissional. Isso torna o
 * conflito impossível ao nível da base, não apenas improvável ao nível da
 * aplicação.
 *
 * Este serviço calcula `departAt` antes de gravar e traduz o erro 23P01 do
 * Postgres numa mensagem que diz à pessoa o que fazer.
 */

import { Prisma, type AppointmentStatus } from "@prisma/client";
import { prisma } from "@/server/db";
import { recordAudit } from "@/server/audit";
import { recordTimeline } from "@/server/timeline";
import { ConflictError, NotFoundError, ValidationError } from "@/server/errors";
import {
  type Actor,
  appointmentScope,
  assertCan,
  assertOwns,
  canAll,
} from "@/server/permissions";
import { appointmentCode } from "@/lib/format";
import { formatDateTime, formatDuration, lisbonWeekday } from "@/lib/datetime";
import { formatEUR, sumCents } from "@/lib/money";

/** Código do Postgres para violação de constraint de exclusão (EXCLUDE). */
const PG_EXCLUSION_VIOLATION = "23P01";

/** Estados que não ocupam a agenda. */
const INACTIVE_STATUSES: AppointmentStatus[] = ["CANCELLED", "NO_SHOW"];

export interface AppointmentInput {
  clientId: string;
  professionalId: string;
  serviceIds: string[];
  startAt: Date;
  addressId?: string | null;
  clientNotes?: string | null;
  internalNotes?: string | null;
}

export interface AgendaRange {
  from: Date;
  to: Date;
  professionalId?: string;
}

// ── Leitura ──────────────────────────────────────────────────

export async function listAppointments(actor: Actor, range: AgendaRange) {
  const scope = appointmentScope(actor);

  const where: Prisma.AppointmentWhereInput = {
    ...scope,
    startAt: { gte: range.from, lte: range.to },
  };
  if (range.professionalId) where.professionalId = range.professionalId;

  return prisma.appointment.findMany({
    where,
    orderBy: { startAt: "asc" },
    include: {
      client: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phone: true,
          city: true,
          addressLine: true,
        },
      },
      professional: { select: { id: true, displayName: true, color: true } },
      items: { select: { nameSnapshot: true, durationMin: true, totalCents: true } },
    },
  });
}

export async function getAppointment(actor: Actor, appointmentId: string) {
  const scope = appointmentScope(actor);

  const appointment = await prisma.appointment.findFirst({
    where: { ...scope, id: appointmentId },
    include: {
      client: true,
      professional: { select: { id: true, displayName: true, color: true } },
      items: { include: { service: { select: { id: true, name: true } } } },
      statusHistory: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!appointment) throw new NotFoundError("Marcação");
  return appointment;
}

// ── Cálculo de deslocação ────────────────────────────────────

/**
 * Estima o tempo de deslocação até à cliente, em minutos.
 *
 * A v1 usa o `estimatedMin` da zona — um valor fixo por área definido pela
 * fundadora. É deliberadamente conservador: prefere-se sobrestimar (e a
 * profissional chegar cedo) a subestimar (e chegar atrasada a casa de alguém).
 *
 * A integração com uma API de mapas fica para a Fase 3 avançada; o modelo
 * `TravelEstimate` já existe para guardar a cache dessas chamadas.
 */
async function estimateTravelMinutes(
  unitId: string,
  clientId: string,
): Promise<number> {
  const client = await prisma.client.findFirst({
    where: { id: clientId, unitId },
    select: { travelZone: { select: { estimatedMin: true } } },
  });

  // Sem zona conhecida assume-se o pior caso das zonas ativas, para nunca
  // marcar duas visitas demasiado perto uma da outra por falta de dados.
  if (!client?.travelZone) {
    const worst = await prisma.travelZone.findFirst({
      where: { unitId, isActive: true },
      orderBy: { estimatedMin: "desc" },
      select: { estimatedMin: true },
    });
    return worst?.estimatedMin ?? 30;
  }

  return client.travelZone.estimatedMin;
}

/** Taxa de deslocação, já com a regra de isenção acima de certo valor. */
async function travelFeeFor(
  unitId: string,
  clientId: string,
  subtotalCents: number,
): Promise<number> {
  const client = await prisma.client.findFirst({
    where: { id: clientId, unitId },
    select: {
      travelZone: {
        select: { feeCents: true, freeAboveCents: true, minSpendCents: true, name: true },
      },
    },
  });

  const zone = client?.travelZone;
  if (!zone) return 0;

  if (zone.minSpendCents > 0 && subtotalCents < zone.minSpendCents) {
    throw new ValidationError(
      `A zona ${zone.name} exige um mínimo de ${formatEUR(zone.minSpendCents)} por deslocação. ` +
        `Este atendimento soma ${formatEUR(subtotalCents)} — acrescente um serviço ou combine outra zona.`,
    );
  }

  if (zone.freeAboveCents !== null && subtotalCents >= zone.freeAboveCents) {
    return 0;
  }

  return zone.feeCents;
}

// ── Disponibilidade ──────────────────────────────────────────

export interface AvailabilityCheck {
  available: boolean;
  reason?: string;
  /**
   * `HARD` — fisicamente impossível (sobreposição com outro atendimento,
   * contando a estrada). Ninguém pode forçar isto, nem a proprietária: a
   * constraint da base recusa, e com razão — uma pessoa não está em dois
   * sítios ao mesmo tempo.
   *
   * `SOFT` — vai contra uma regra que é decisão da casa (fora do horário,
   * durante férias). Quem tem `appointment:override_conflict` pode forçar,
   * porque há dias em que se abre uma exceção para uma cliente.
   */
  severity?: "HARD" | "SOFT";
  conflictsWith?: { code: string; startAt: Date; clientName: string };
}

/**
 * Verifica se uma profissional pode atender num dado intervalo.
 *
 * Confirma três coisas, por ordem de custo:
 *   1. Está dentro do horário de trabalho dela nesse dia da semana?
 *   2. Está fora de férias/ausências?
 *   3. Cabe entre as marcações existentes, contando a deslocação?
 *
 * Isto é uma verificação otimista para dar feedback imediato na interface. A
 * garantia real continua a ser a constraint da base — entre esta verificação e
 * o INSERT pode haver outra pessoa a marcar o mesmo intervalo.
 */
export async function checkAvailability(
  professionalId: string,
  startAt: Date,
  endAt: Date,
  travelToMin: number,
  excludeAppointmentId?: string,
): Promise<AvailabilityCheck> {
  const departAt = new Date(startAt.getTime() - travelToMin * 60_000);
  const weekday = lisbonWeekday(startAt);

  const startMinute = startAt.getUTCHours() * 60 + startAt.getUTCMinutes();
  const endMinute = endAt.getUTCHours() * 60 + endAt.getUTCMinutes();

  const workingHours = await prisma.workingHour.findMany({
    where: { professionalId, weekday },
  });

  if (workingHours.length === 0) {
    return {
      available: false,
      severity: "SOFT",
      reason: "A profissional não trabalha neste dia da semana.",
    };
  }

  const insideShift = workingHours.some(
    (h) => startMinute >= h.startMin && endMinute <= h.endMin,
  );
  if (!insideShift) {
    const shifts = workingHours
      .map((h) => `${Math.floor(h.startMin / 60)}h–${Math.floor(h.endMin / 60)}h`)
      .join(", ");
    return {
      available: false,
      severity: "SOFT",
      reason: `Fora do horário de trabalho (${shifts}).`,
    };
  }

  const timeOff = await prisma.timeOff.findFirst({
    where: {
      professionalId,
      startAt: { lt: endAt },
      endAt: { gt: departAt },
    },
    select: { type: true },
  });
  if (timeOff) {
    return {
      available: false,
      severity: "SOFT",
      reason: `A profissional tem uma ausência registada neste período (${timeOff.type}).`,
    };
  }

  const conflict = await prisma.appointment.findFirst({
    where: {
      professionalId,
      deletedAt: null,
      status: { notIn: INACTIVE_STATUSES },
      ...(excludeAppointmentId && { NOT: { id: excludeAppointmentId } }),
      departAt: { lt: endAt },
      endAt: { gt: departAt },
    },
    select: {
      code: true,
      startAt: true,
      endAt: true,
      client: { select: { firstName: true, lastName: true } },
    },
  });

  if (conflict) {
    const clientName =
      `${conflict.client.firstName} ${conflict.client.lastName ?? ""}`.trim();
    return {
      available: false,
      severity: "HARD",
      reason:
        `Choca com a marcação ${conflict.code} de ${clientName}, ` +
        `das ${formatDateTime(conflict.startAt)} às ${formatDateTime(conflict.endAt)}. ` +
        `Com ${formatDuration(travelToMin)} de deslocação, é preciso sair às ${formatDateTime(departAt)}.`,
      conflictsWith: {
        code: conflict.code,
        startAt: conflict.startAt,
        clientName,
      },
    };
  }

  return { available: true };
}

// ── Escrita ──────────────────────────────────────────────────

export async function createAppointment(
  actor: Actor,
  input: AppointmentInput,
) {
  assertCan(actor, "appointment:create");

  if (input.serviceIds.length === 0) {
    throw new ValidationError("Escolha pelo menos um serviço.");
  }

  const [client, professional, services] = await Promise.all([
    prisma.client.findFirst({
      where: { unitId: actor.unitId, id: input.clientId, deletedAt: null },
      select: { id: true, firstName: true, lastName: true, phone: true, status: true },
    }),
    prisma.professional.findFirst({
      where: { unitId: actor.unitId, id: input.professionalId, deletedAt: null },
      select: { id: true, displayName: true, isBookable: true },
    }),
    prisma.service.findMany({
      where: {
        unitId: actor.unitId,
        id: { in: input.serviceIds },
        deletedAt: null,
        isActive: true,
      },
    }),
  ]);

  if (!client) throw new NotFoundError("Cliente");
  if (!professional) throw new NotFoundError("Profissional");
  if (!professional.isBookable) {
    throw new ValidationError(
      `${professional.displayName} não está disponível para marcações.`,
    );
  }
  if (services.length !== input.serviceIds.length) {
    throw new ValidationError(
      "Um ou mais serviços não existem ou já não estão ativos.",
    );
  }
  if (client.status === "BLOCKED") {
    throw new ValidationError(
      `A ficha de ${client.firstName} está bloqueada. Desbloqueie-a antes de marcar.`,
    );
  }

  // Duração total: soma dos serviços mais preparação e arrumação, contadas
  // uma só vez por visita (não por serviço).
  const serviceMinutes = services.reduce((sum, s) => sum + s.durationMin, 0);
  const setupMin = Math.max(...services.map((s) => s.setupMin));
  const teardownMin = Math.max(...services.map((s) => s.teardownMin));
  const totalMinutes = serviceMinutes + setupMin + teardownMin;

  const startAt = input.startAt;
  const endAt = new Date(startAt.getTime() + totalMinutes * 60_000);

  if (startAt < new Date()) {
    throw new ValidationError("Não é possível marcar no passado.");
  }

  const travelToMin = await estimateTravelMinutes(actor.unitId, client.id);
  const departAt = new Date(startAt.getTime() - travelToMin * 60_000);

  const subtotalCents = sumCents(...services.map((s) => s.priceCents));
  const travelFeeCents = await travelFeeFor(
    actor.unitId,
    client.id,
    subtotalCents,
  );
  const totalCents = sumCents(subtotalCents, travelFeeCents);

  // Verificação otimista: dá uma mensagem útil antes de tentar gravar.
  const availability = await checkAvailability(
    professional.id,
    startAt,
    endAt,
    travelToMin,
  );
  if (!availability.available) {
    // Um conflito HARD é sobreposição física — não há permissão que o
    // ultrapasse, e a constraint da base recusaria de qualquer forma. Deixar
    // passar aqui só trocaria uma mensagem clara por um erro de Postgres.
    const overridable =
      availability.severity === "SOFT" &&
      canAll(actor, "appointment:override_conflict");

    if (!overridable) {
      throw new ConflictError(
        "APPOINTMENT_CONFLICT",
        availability.reason ??
          "A profissional não está disponível neste horário.",
        availability.conflictsWith,
      );
    }
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const created = await tx.appointment.create({
        data: {
          unitId: actor.unitId,
          code: appointmentCode(startAt),
          clientId: client.id,
          professionalId: professional.id,
          status: "CONFIRMED",
          startAt,
          endAt,
          departAt,
          travelToMin,
          travelFeeCents,
          subtotalCents,
          totalCents,
          addressId: input.addressId ?? null,
          clientNotes: input.clientNotes?.trim() || null,
          internalNotes: input.internalNotes?.trim() || null,
          createdById: actor.userId,
          source: "MANUAL",
          items: {
            create: services.map((s) => ({
              serviceId: s.id,
              nameSnapshot: s.name,
              durationMin: s.durationMin,
              unitPriceCents: s.priceCents,
              quantity: 1,
              totalCents: s.priceCents,
              commissionBps: s.commissionBps,
            })),
          },
        },
        include: { items: true },
      });

      await tx.appointmentStatusChange.create({
        data: {
          appointmentId: created.id,
          fromStatus: null,
          toStatus: "CONFIRMED",
          changedById: actor.userId,
        },
      });

      await recordAudit(tx, actor, {
        action: "CREATE",
        entityType: "Appointment",
        entityId: created.id,
        after: created,
      });

      await recordTimeline(tx, actor, {
        clientId: client.id,
        entityType: "Appointment",
        entityId: created.id,
        type: "APPOINTMENT_BOOKED",
        title: `Marcação para ${formatDateTime(startAt)}`,
        body: services.map((s) => s.name).join(", "),
        occurredAt: new Date(),
      });

      return created;
    });
  } catch (err) {
    throw translateConflict(err, travelToMin, departAt);
  }
}

/**
 * Traduz a violação da constraint de exclusão numa mensagem acionável.
 *
 * Sem isto, uma condição de corrida entre duas marcações simultâneas daria à
 * utilizadora um erro do Postgres em inglês sobre `tstzrange`.
 */
function translateConflict(
  err: unknown,
  travelToMin: number,
  departAt: Date,
): unknown {
  if (pgErrorCode(err) === PG_EXCLUSION_VIOLATION) {
    return new ConflictError(
      "APPOINTMENT_CONFLICT",
      `Este horário deixou de estar livre. Com ${formatDuration(travelToMin)} de deslocação, ` +
        `seria preciso sair às ${formatDateTime(departAt)} — e nessa altura a profissional já está noutro atendimento. ` +
        `Escolha outra hora ou outra profissional.`,
    );
  }

  return err;
}

/**
 * Extrai o código de erro do Postgres (SQLSTATE) de um erro do Prisma.
 *
 * No Prisma 7 com driver adapter, o código do Postgres não está em `err.code`
 * — aí está o código do Prisma (`P2039`). O SQLSTATE original fica aninhado em
 * `meta.driverAdapterError.cause.code`. Procurar no sítio errado faz a
 * tradução falhar em silêncio e o utilizador recebe um erro cru do Postgres.
 */
function pgErrorCode(err: unknown): string | undefined {
  if (!err || typeof err !== "object") return undefined;

  const meta = (err as { meta?: unknown }).meta;
  if (meta && typeof meta === "object") {
    const adapterError = (meta as { driverAdapterError?: unknown })
      .driverAdapterError;
    if (adapterError && typeof adapterError === "object") {
      const cause = (adapterError as { cause?: unknown }).cause;
      if (cause && typeof cause === "object") {
        const code = (cause as { code?: unknown }).code;
        if (typeof code === "string") return code;
      }
    }
  }

  // Ligação direta ao `pg`, sem passar pelo Prisma (usada nos testes).
  const direct = (err as { code?: unknown }).code;
  return typeof direct === "string" ? direct : undefined;
}

export async function cancelAppointment(
  actor: Actor,
  appointmentId: string,
  reason: string,
) {
  assertCan(actor, "appointment:cancel");

  const before = await prisma.appointment.findFirst({
    where: { unitId: actor.unitId, id: appointmentId, deletedAt: null },
    include: { client: { select: { id: true, firstName: true } } },
  });
  if (!before) throw new NotFoundError("Marcação");

  assertOwns(actor, "appointment:cancel", before.professionalId);

  if (INACTIVE_STATUSES.includes(before.status)) {
    throw new ConflictError(
      "APPOINTMENT_ALREADY_CLOSED",
      `Esta marcação já está ${before.status === "CANCELLED" ? "cancelada" : "marcada como falta"}.`,
    );
  }
  if (before.status === "COMPLETED") {
    throw new ConflictError(
      "APPOINTMENT_COMPLETED",
      "Não é possível cancelar um atendimento já concluído.",
    );
  }

  if (!reason?.trim()) {
    throw new ValidationError(
      "Indique o motivo do cancelamento — fica no histórico da cliente.",
    );
  }

  return prisma.$transaction(async (tx) => {
    const cancelled = await tx.appointment.update({
      where: { id: appointmentId },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
        cancelledBy: actor.professionalId === before.professionalId
          ? "PROFESSIONAL"
          : "CLIENT",
        cancelReason: reason.trim(),
      },
    });

    await tx.appointmentStatusChange.create({
      data: {
        appointmentId,
        fromStatus: before.status,
        toStatus: "CANCELLED",
        changedById: actor.userId,
        reason: reason.trim(),
      },
    });

    await tx.client.update({
      where: { id: before.clientId },
      data: { cancelCount: { increment: 1 } },
    });

    await recordAudit(tx, actor, {
      action: "UPDATE",
      entityType: "Appointment",
      entityId: appointmentId,
      before: { status: before.status },
      after: { status: "CANCELLED", cancelReason: reason.trim() },
    });

    await recordTimeline(tx, actor, {
      clientId: before.clientId,
      entityType: "Appointment",
      entityId: appointmentId,
      type: "APPOINTMENT_CANCELLED",
      title: `Marcação de ${formatDateTime(before.startAt)} cancelada`,
      body: reason.trim(),
    });

    return cancelled;
  });
}

/**
 * Conclui o atendimento.
 *
 * É aqui que o negócio "acontece": atualiza as métricas da cliente, dá o
 * carimbo de fidelidade e abate o material. Tudo na mesma transação — se o
 * carimbo falhar, o atendimento não fica concluído pela metade.
 */
export async function completeAppointment(
  actor: Actor,
  appointmentId: string,
) {
  assertCan(actor, "appointment:update");

  const before = await prisma.appointment.findFirst({
    where: { unitId: actor.unitId, id: appointmentId, deletedAt: null },
    include: {
      client: { select: { id: true, visitCount: true, lifetimeValueCents: true, firstVisitAt: true } },
      items: { select: { serviceId: true } },
    },
  });
  if (!before) throw new NotFoundError("Marcação");

  assertOwns(actor, "appointment:update", before.professionalId);

  if (before.status === "COMPLETED") {
    throw new ConflictError(
      "APPOINTMENT_ALREADY_COMPLETED",
      "Este atendimento já está concluído.",
    );
  }
  if (INACTIVE_STATUSES.includes(before.status)) {
    throw new ConflictError(
      "APPOINTMENT_CLOSED",
      "Não é possível concluir uma marcação cancelada ou com falta.",
    );
  }

  const now = new Date();

  return prisma.$transaction(async (tx) => {
    const completed = await tx.appointment.update({
      where: { id: appointmentId },
      data: { status: "COMPLETED", completedAt: now },
    });

    await tx.appointmentStatusChange.create({
      data: {
        appointmentId,
        fromStatus: before.status,
        toStatus: "COMPLETED",
        changedById: actor.userId,
      },
    });

    const newVisitCount = before.client.visitCount + 1;
    const newLtv = sumCents(before.client.lifetimeValueCents, before.totalCents);

    await tx.client.update({
      where: { id: before.clientId },
      data: {
        status: "ACTIVE",
        visitCount: newVisitCount,
        lastVisitAt: now,
        firstVisitAt: before.client.firstVisitAt ?? now,
        lifetimeValueCents: newLtv,
        avgTicketCents: Math.round(newLtv / newVisitCount),
      },
    });

    await addLoyaltyStamp(tx, actor, before.clientId, appointmentId);
    await consumeMaterials(tx, actor, before.items.map((i) => i.serviceId), appointmentId);

    await recordAudit(tx, actor, {
      action: "UPDATE",
      entityType: "Appointment",
      entityId: appointmentId,
      before: { status: before.status },
      after: { status: "COMPLETED" },
    });

    await recordTimeline(tx, actor, {
      clientId: before.clientId,
      entityType: "Appointment",
      entityId: appointmentId,
      type: "APPOINTMENT_COMPLETED",
      title: `Atendimento concluído — ${formatEUR(before.totalCents)}`,
      occurredAt: now,
    });

    return completed;
  });
}

/**
 * Dá um carimbo no cartão AYAHA Club.
 *
 * O cartão tem 5 carimbos; ao quinto fica completo e a cliente escolhe uma de
 * três recompensas. Um cartão novo é aberto no mesmo momento, para que o
 * atendimento seguinte já tenha onde carimbar.
 */
async function addLoyaltyStamp(
  tx: Prisma.TransactionClient,
  actor: Actor,
  clientId: string,
  appointmentId: string,
): Promise<void> {
  const program = await tx.loyaltyProgram.findFirst({
    where: { unitId: actor.unitId, isActive: true },
    select: { id: true, stampsRequired: true, autoRestart: true },
  });
  if (!program) return;

  const card = await tx.loyaltyCard.findFirst({
    where: { clientId, isActive: true },
  });
  if (!card) return;

  const newCount = card.stampsCount + 1;
  const isComplete = newCount >= card.stampsRequired;

  await tx.loyaltyStamp.create({
    data: { cardId: card.id, appointmentId, reason: "APPOINTMENT" },
  });

  await tx.loyaltyCard.update({
    where: { id: card.id },
    data: {
      stampsCount: newCount,
      ...(isComplete && { completedAt: new Date(), isActive: false }),
    },
  });

  await recordTimeline(tx, actor, {
    clientId,
    entityType: "LoyaltyCard",
    entityId: card.id,
    type: isComplete ? "LOYALTY_CARD_COMPLETED" : "LOYALTY_STAMP",
    title: isComplete
      ? "Cartão completo! Pode escolher uma recompensa."
      : `Carimbo ${newCount} de ${card.stampsRequired}`,
    isPinned: isComplete,
  });

  if (isComplete && program.autoRestart) {
    await tx.loyaltyCard.create({
      data: {
        programId: program.id,
        clientId,
        cycleNumber: card.cycleNumber + 1,
        stampsCount: 0,
        stampsRequired: program.stampsRequired,
        isActive: true,
      },
    });
  }
}

/**
 * Abate o material consumido, com base na lista de materiais de cada serviço.
 *
 * Sem isto o stock nunca desce e os alertas de reposição não valem nada — a
 * fundadora só descobria que não havia cola no momento de a usar.
 */
async function consumeMaterials(
  tx: Prisma.TransactionClient,
  actor: Actor,
  serviceIds: string[],
  appointmentId: string,
): Promise<void> {
  const boms = await tx.serviceMaterial.findMany({
    where: { serviceId: { in: serviceIds } },
    select: { materialId: true, quantity: true },
  });
  if (boms.length === 0) return;

  // Um material pode aparecer em vários serviços do mesmo atendimento.
  const totals = new Map<string, number>();
  for (const bom of boms) {
    totals.set(bom.materialId, (totals.get(bom.materialId) ?? 0) + bom.quantity);
  }

  for (const [materialId, quantity] of totals) {
    const material = await tx.material.findUnique({
      where: { id: materialId },
      select: { quantityOnHand: true },
    });
    if (!material) continue;

    // A constraint `material_qty_nonneg` impede stock negativo. Sem este
    // limite, concluir um atendimento falharia por falta de material — o que
    // seria absurdo: o serviço já foi prestado.
    const consumed = Math.min(quantity, material.quantityOnHand);
    if (consumed <= 0) continue;

    await tx.material.update({
      where: { id: materialId },
      data: { quantityOnHand: { decrement: consumed } },
    });

    await tx.stockMovement.create({
      data: {
        unitId: actor.unitId,
        materialId,
        appointmentId,
        kind: "CONSUMPTION",
        quantity: -consumed,
        createdById: actor.userId,
      },
    });
  }
}

/** Marcações de hoje, para o painel inicial. */
export async function todayAppointments(actor: Actor) {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  return listAppointments(actor, { from: start, to: end });
}
