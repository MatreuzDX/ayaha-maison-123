/**
 * Equipa e horários. Ver especificação secção 11.
 *
 * Duas cautelas específicas deste módulo:
 *   1. `ibanEncrypted` e dados de pagamento só saem para quem tem
 *      `professional:pay_data`. Uma profissional vê o seu, não o das colegas.
 *   2. Alterar horários mexe com marcações já feitas. Este serviço avisa,
 *      não apaga.
 */

import type { Prisma } from "@prisma/client";
import { prisma } from "@/server/db";
import { diffFields, recordAudit } from "@/server/audit";
import { ConflictError, NotFoundError, ValidationError } from "@/server/errors";
import {
  type Actor,
  assertCan,
  canAll,
  professionalScope,
} from "@/server/permissions";
import { formatMinuteOfDay } from "@/lib/datetime";

/** Campos que só quem tem `professional:pay_data` pode ver. */
const PAY_FIELDS = ["taxId", "ibanEncrypted", "monthlyTargetCents"] as const;

export interface WorkingHourInput {
  weekday: number;
  startMin: number;
  endMin: number;
}

export async function listProfessionals(actor: Actor) {
  const scope = professionalScope(actor);
  const showPay = canAll(actor, "professional:pay_data");

  const rows = await prisma.professional.findMany({
    where: scope,
    orderBy: { displayName: "asc" },
    include: {
      user: { select: { email: true, isActive: true, lastLoginAt: true } },
      workingHours: { orderBy: [{ weekday: "asc" }, { startMin: "asc" }] },
      _count: { select: { appointments: true, skills: true } },
    },
  });

  if (showPay) return rows;

  // Retirar os campos sensíveis em vez de os pedir e confiar na UI para os
  // esconder: dados que não saem da base não podem vazar por engano num JSON.
  return rows.map((row) => {
    const safe = { ...row };
    for (const field of PAY_FIELDS) {
      (safe as Record<string, unknown>)[field] = null;
    }
    return safe;
  });
}

export async function getProfessional(actor: Actor, professionalId: string) {
  const scope = professionalScope(actor);

  const professional = await prisma.professional.findFirst({
    where: { ...scope, id: professionalId },
    include: {
      user: { select: { email: true, name: true, isActive: true, lastLoginAt: true } },
      workingHours: { orderBy: [{ weekday: "asc" }, { startMin: "asc" }] },
      skills: { include: { service: { select: { id: true, name: true } } } },
      timeOff: {
        where: { endAt: { gte: new Date() } },
        orderBy: { startAt: "asc" },
      },
      _count: { select: { appointments: true } },
    },
  });

  if (!professional) throw new NotFoundError("Profissional");

  // Escopo OWN em `pay_data` deixa ver os próprios dados; para os das colegas
  // é preciso escopo total.
  const isSelf = professional.id === actor.professionalId;
  if (!canAll(actor, "professional:pay_data") && !isSelf) {
    const safe = { ...professional };
    for (const field of PAY_FIELDS) {
      (safe as Record<string, unknown>)[field] = null;
    }
    return safe;
  }

  return professional;
}

/**
 * Define o horário semanal de uma profissional.
 *
 * Substitui o horário inteiro em vez de aceitar alterações parciais — é a
 * única forma de garantir que não ficam blocos órfãos de uma versão anterior.
 */
export async function setWorkingHours(
  actor: Actor,
  professionalId: string,
  hours: WorkingHourInput[],
) {
  assertCan(actor, "schedule:write");

  const professional = await prisma.professional.findFirst({
    where: { unitId: actor.unitId, id: professionalId, deletedAt: null },
    select: { id: true, displayName: true },
  });
  if (!professional) throw new NotFoundError("Profissional");

  // Escopo OWN: uma profissional só mexe no próprio horário.
  if (!canAll(actor, "schedule:write") && professionalId !== actor.professionalId) {
    throw new ConflictError(
      "SCHEDULE_NOT_OWN",
      "Só pode alterar o seu próprio horário.",
    );
  }

  for (const h of hours) {
    if (!Number.isInteger(h.weekday) || h.weekday < 0 || h.weekday > 6) {
      throw new ValidationError(
        "Dia da semana inválido. Use 0 (domingo) a 6 (sábado).",
      );
    }
    if (h.startMin < 0 || h.endMin > 1440 || h.endMin <= h.startMin) {
      throw new ValidationError(
        `Horário inválido a ${formatMinuteOfDay(h.startMin)}–${formatMinuteOfDay(h.endMin)}: a hora de fim tem de ser depois da de início.`,
      );
    }
  }

  // Blocos do mesmo dia não se podem sobrepor — senão a disponibilidade
  // contaria o mesmo intervalo duas vezes.
  const byDay = new Map<number, WorkingHourInput[]>();
  for (const h of hours) {
    const list = byDay.get(h.weekday) ?? [];
    list.push(h);
    byDay.set(h.weekday, list);
  }
  for (const [weekday, list] of byDay) {
    const sorted = [...list].sort((a, b) => a.startMin - b.startMin);
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1]!;
      const curr = sorted[i]!;
      if (curr.startMin < prev.endMin) {
        throw new ValidationError(
          `Blocos sobrepostos no dia ${weekday}: ${formatMinuteOfDay(prev.startMin)}–${formatMinuteOfDay(prev.endMin)} e ${formatMinuteOfDay(curr.startMin)}–${formatMinuteOfDay(curr.endMin)}.`,
        );
      }
    }
  }

  return prisma.$transaction(async (tx) => {
    const before = await tx.workingHour.findMany({ where: { professionalId } });

    await tx.workingHour.deleteMany({ where: { professionalId } });

    if (hours.length > 0) {
      await tx.workingHour.createMany({
        data: hours.map((h) => ({ ...h, professionalId })),
      });
    }

    const after = await tx.workingHour.findMany({ where: { professionalId } });

    await recordAudit(tx, actor, {
      action: "UPDATE",
      entityType: "WorkingHour",
      entityId: professionalId,
      before,
      after,
    });

    return after;
  });
}

export async function updateProfessional(
  actor: Actor,
  professionalId: string,
  input: {
    displayName?: string;
    bio?: string | null;
    color?: string;
    isBookable?: boolean;
    maxTravelMin?: number;
    hasVehicle?: boolean;
    transportMode?: string;
  },
) {
  assertCan(actor, "professional:write");

  const before = await prisma.professional.findFirst({
    where: { unitId: actor.unitId, id: professionalId, deletedAt: null },
  });
  if (!before) throw new NotFoundError("Profissional");

  if (input.color && !/^#[0-9a-fA-F]{6}$/.test(input.color)) {
    throw new ValidationError("A cor tem de estar no formato #RRGGBB.");
  }
  if (
    input.maxTravelMin !== undefined &&
    (!Number.isInteger(input.maxTravelMin) || input.maxTravelMin < 0)
  ) {
    throw new ValidationError(
      "O tempo máximo de deslocação tem de ser um número inteiro de minutos.",
    );
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.professional.update({
      where: { id: professionalId },
      data: {
        displayName: input.displayName?.trim() ?? before.displayName,
        bio: input.bio !== undefined ? input.bio?.trim() || null : before.bio,
        color: input.color ?? before.color,
        isBookable: input.isBookable ?? before.isBookable,
        maxTravelMin: input.maxTravelMin ?? before.maxTravelMin,
        hasVehicle: input.hasVehicle ?? before.hasVehicle,
        transportMode: input.transportMode ?? before.transportMode,
      },
    });

    const diff = diffFields(
      before as unknown as Record<string, unknown>,
      updated as unknown as Record<string, unknown>,
    );

    await recordAudit(tx, actor, {
      action: "UPDATE",
      entityType: "Professional",
      entityId: professionalId,
      before: diff.before,
      after: diff.after,
    });

    return updated;
  });
}

/** Profissionais que sabem executar um serviço e estão disponíveis para marcação. */
export async function professionalsForService(
  actor: Actor,
  serviceId: string,
): Promise<{ id: string; displayName: string; color: string }[]> {
  assertCan(actor, "professional:read");

  const where: Prisma.ProfessionalWhereInput = {
    unitId: actor.unitId,
    deletedAt: null,
    isBookable: true,
    skills: { some: { serviceId } },
  };

  return prisma.professional.findMany({
    where,
    orderBy: { displayName: "asc" },
    select: { id: true, displayName: true, color: true },
  });
}
