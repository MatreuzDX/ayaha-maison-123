/**
 * Catálogo de serviços. Ver especificação secção 10.
 *
 * Nota de negócio: os sete serviços da AYAHA custam todos €30. Não é um erro
 * de dados — é decisão da fundadora. O código não assume preços distintos em
 * lado nenhum, mas também não impede que venham a divergir.
 */

import type { Prisma } from "@prisma/client";
import { prisma } from "@/server/db";
import { diffFields, recordAudit } from "@/server/audit";
import { ConflictError, NotFoundError, ValidationError } from "@/server/errors";
import { type Actor, assertCan } from "@/server/permissions";
import { slugify } from "@/lib/format";

export interface ServiceInput {
  name: string;
  categoryId: string;
  tagline?: string | null;
  description?: string | null;
  durationMin: number;
  setupMin?: number;
  teardownMin?: number;
  priceCents: number;
  vatBps?: number;
  costCents?: number;
  recommendedGapDays?: number | null;
  minAdvanceHours?: number;
  maxAdvanceDays?: number;
  requiresPatchTest?: boolean;
  isActive?: boolean;
}

function validate(input: ServiceInput) {
  const name = input.name?.trim();
  if (!name) throw new ValidationError("Indique o nome do serviço.");

  if (!Number.isInteger(input.durationMin) || input.durationMin <= 0) {
    throw new ValidationError(
      "A duração tem de ser um número inteiro de minutos maior que zero.",
    );
  }
  if (input.durationMin > 8 * 60) {
    throw new ValidationError(
      "A duração ultrapassa 8 horas. Confirme o valor em minutos (120 = 2 h).",
    );
  }
  // Dinheiro é sempre Int em cêntimos (ADR-02). Um Float aqui produziria
  // faturas com meio cêntimo e totais que não fecham.
  if (!Number.isInteger(input.priceCents) || input.priceCents < 0) {
    throw new ValidationError(
      "O preço tem de ser um valor inteiro em cêntimos (30,00 € = 3000).",
    );
  }

  return {
    name,
    tagline: input.tagline?.trim() || null,
    description: input.description?.trim() || null,
    durationMin: input.durationMin,
    setupMin: input.setupMin ?? 15,
    teardownMin: input.teardownMin ?? 5,
    priceCents: input.priceCents,
    vatBps: input.vatBps ?? 0,
    costCents: input.costCents ?? 0,
    recommendedGapDays: input.recommendedGapDays ?? null,
    minAdvanceHours: input.minAdvanceHours ?? 12,
    maxAdvanceDays: input.maxAdvanceDays ?? 90,
    requiresPatchTest: input.requiresPatchTest ?? false,
    isActive: input.isActive ?? true,
  };
}

export async function listServices(
  actor: Actor,
  opts: { includeInactive?: boolean } = {},
) {
  assertCan(actor, "service:read");

  const where: Prisma.ServiceWhereInput = {
    unitId: actor.unitId,
    deletedAt: null,
  };
  if (!opts.includeInactive) where.isActive = true;

  return prisma.service.findMany({
    where,
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: {
      category: { select: { id: true, name: true } },
      _count: { select: { appointmentItems: true } },
    },
  });
}

export async function getService(actor: Actor, serviceId: string) {
  assertCan(actor, "service:read");

  const service = await prisma.service.findFirst({
    where: { unitId: actor.unitId, id: serviceId, deletedAt: null },
    include: {
      category: true,
      materials: { include: { material: true } },
      skills: {
        include: {
          professional: { select: { id: true, displayName: true, color: true } },
        },
      },
    },
  });

  if (!service) throw new NotFoundError("Serviço");
  return service;
}

export async function listCategories(actor: Actor) {
  assertCan(actor, "service:read");
  return prisma.serviceCategory.findMany({
    where: { unitId: actor.unitId, isActive: true },
    orderBy: { sortOrder: "asc" },
  });
}

export async function createService(actor: Actor, input: ServiceInput) {
  assertCan(actor, "service:write");

  const data = validate(input);
  const slug = slugify(data.name);

  const clash = await prisma.service.findFirst({
    where: { unitId: actor.unitId, slug },
    select: { id: true, deletedAt: true },
  });
  if (clash) {
    throw new ConflictError(
      "SERVICE_DUPLICATE_SLUG",
      clash.deletedAt
        ? `Já existiu um serviço com este nome. Reative-o em vez de criar outro.`
        : `Já existe um serviço chamado "${data.name}".`,
      { serviceId: clash.id },
    );
  }

  const category = await prisma.serviceCategory.findFirst({
    where: { unitId: actor.unitId, id: input.categoryId },
    select: { id: true },
  });
  if (!category) throw new NotFoundError("Categoria");

  const last = await prisma.service.findFirst({
    where: { unitId: actor.unitId },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });

  return prisma.$transaction(async (tx) => {
    const created = await tx.service.create({
      data: {
        ...data,
        slug,
        unitId: actor.unitId,
        categoryId: category.id,
        sortOrder: (last?.sortOrder ?? -1) + 1,
      },
    });

    await recordAudit(tx, actor, {
      action: "CREATE",
      entityType: "Service",
      entityId: created.id,
      after: created,
    });

    return created;
  });
}

export async function updateService(
  actor: Actor,
  serviceId: string,
  input: Partial<ServiceInput>,
) {
  assertCan(actor, "service:write");

  const before = await prisma.service.findFirst({
    where: { unitId: actor.unitId, id: serviceId, deletedAt: null },
  });
  if (!before) throw new NotFoundError("Serviço");

  const data = validate({ ...before, ...input } as ServiceInput);

  return prisma.$transaction(async (tx) => {
    const updated = await tx.service.update({
      where: { id: serviceId },
      data,
    });

    const diff = diffFields(
      before as unknown as Record<string, unknown>,
      updated as unknown as Record<string, unknown>,
    );

    await recordAudit(tx, actor, {
      action: "UPDATE",
      entityType: "Service",
      entityId: serviceId,
      before: diff.before,
      after: diff.after,
    });

    return updated;
  });
}

/**
 * Desativa um serviço.
 *
 * Nunca apaga: os `AppointmentItem` guardam um snapshot do nome e do preço,
 * mas a relação com o serviço é usada em relatórios históricos. Desativar
 * tira-o da marcação sem partir o passado.
 */
export async function deactivateService(actor: Actor, serviceId: string) {
  assertCan(actor, "service:write");

  const before = await prisma.service.findFirst({
    where: { unitId: actor.unitId, id: serviceId, deletedAt: null },
  });
  if (!before) throw new NotFoundError("Serviço");

  const upcoming = await prisma.appointmentItem.count({
    where: {
      serviceId,
      appointment: {
        deletedAt: null,
        startAt: { gte: new Date() },
        status: { notIn: ["CANCELLED", "NO_SHOW"] },
      },
    },
  });
  if (upcoming > 0) {
    throw new ConflictError(
      "SERVICE_HAS_UPCOMING",
      `Este serviço está em ${upcoming} marcação(ões) futura(s). Reagende-as antes de o desativar.`,
    );
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.service.update({
      where: { id: serviceId },
      data: { isActive: false },
    });

    await recordAudit(tx, actor, {
      action: "UPDATE",
      entityType: "Service",
      entityId: serviceId,
      before: { isActive: true },
      after: { isActive: false },
    });

    return updated;
  });
}
