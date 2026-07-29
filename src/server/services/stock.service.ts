/**
 * Stock e materiais. Ver especificação secção 16.
 *
 * O consumo automático acontece ao concluir um atendimento (ver
 * `appointment.service.ts`). Este módulo trata do resto: consultar, corrigir
 * à mão e registar compras.
 *
 * Regra: o stock só muda através de um `StockMovement`. Nunca se escreve
 * `quantityOnHand` diretamente sem deixar rasto — de outro modo é impossível
 * perceber para onde foi a cola quando as contas não batem certo.
 */

import type { Prisma, StockMovementKind } from "@prisma/client";
import { prisma } from "@/server/db";
import { recordAudit } from "@/server/audit";
import { ConflictError, NotFoundError, ValidationError } from "@/server/errors";
import { type Actor, assertCan, canAll } from "@/server/permissions";
import { formatQuantity } from "@/lib/format";

export interface StockFilters {
  search?: string;
  lowOnly?: boolean;
  category?: string;
}

export async function listMaterials(actor: Actor, filters: StockFilters = {}) {
  assertCan(actor, "inventory:read");

  const where: Prisma.MaterialWhereInput = {
    unitId: actor.unitId,
    deletedAt: null,
    isActive: true,
  };

  if (filters.category) where.category = filters.category;
  if (filters.search?.trim()) {
    where.OR = [
      { name: { contains: filters.search.trim(), mode: "insensitive" } },
      { brand: { contains: filters.search.trim(), mode: "insensitive" } },
      { sku: { contains: filters.search.trim(), mode: "insensitive" } },
    ];
  }

  const materials = await prisma.material.findMany({
    where,
    orderBy: { name: "asc" },
    include: { supplier: { select: { id: true, name: true } } },
  });

  // O filtro "em falta" é feito em memória porque compara duas colunas da
  // mesma linha — o Prisma não exprime `quantityOnHand <= minQuantity` numa
  // cláusula `where` sem SQL cru.
  const rows = filters.lowOnly
    ? materials.filter((m) => m.quantityOnHand <= m.minQuantity)
    : materials;

  const showCost = canAll(actor, "inventory:cost");

  return rows.map((m) => ({
    ...m,
    isLow: m.quantityOnHand <= m.minQuantity,
    costCents: showCost ? m.costCents : 0,
    lastCostCents: showCost ? m.lastCostCents : 0,
  }));
}

export async function stockSummary(actor: Actor) {
  assertCan(actor, "inventory:read");

  const materials = await prisma.material.findMany({
    where: { unitId: actor.unitId, deletedAt: null, isActive: true },
    select: { quantityOnHand: true, minQuantity: true, costCents: true },
  });

  const low = materials.filter((m) => m.quantityOnHand <= m.minQuantity).length;
  const totalValueCents = canAll(actor, "inventory:cost")
    ? materials.reduce(
        (sum, m) => sum + Math.round(m.quantityOnHand * m.costCents),
        0,
      )
    : 0;

  return { total: materials.length, low, totalValueCents };
}

export async function getMaterial(actor: Actor, materialId: string) {
  assertCan(actor, "inventory:read");

  const material = await prisma.material.findFirst({
    where: { unitId: actor.unitId, id: materialId, deletedAt: null },
    include: {
      supplier: true,
      movements: {
        orderBy: { createdAt: "desc" },
        take: 50,
        include: {
          appointment: { select: { code: true, startAt: true } },
        },
      },
    },
  });

  if (!material) throw new NotFoundError("Material");
  return material;
}

/**
 * Corrige o stock à mão (contagem física, perda, devolução).
 *
 * `quantity` é a variação, não o valor final: -2 tira dois, +10 acrescenta
 * dez. Pedir o valor final seria mais intuitivo mas apagaria a informação de
 * quanto se perdeu.
 */
export async function adjustStock(
  actor: Actor,
  materialId: string,
  quantity: number,
  kind: StockMovementKind,
  note?: string,
) {
  assertCan(actor, "inventory:write");

  if (!Number.isFinite(quantity) || quantity === 0) {
    throw new ValidationError(
      "Indique a variação de quantidade (por exemplo -2 para retirar duas unidades).",
    );
  }

  const material = await prisma.material.findFirst({
    where: { unitId: actor.unitId, id: materialId, deletedAt: null },
  });
  if (!material) throw new NotFoundError("Material");

  const newQuantity = material.quantityOnHand + quantity;
  if (newQuantity < 0) {
    throw new ConflictError(
      "STOCK_NEGATIVE",
      `Não há stock suficiente. Tem ${formatQuantity(material.quantityOnHand, material.unit_)} ` +
        `e está a tentar retirar ${formatQuantity(Math.abs(quantity), material.unit_)}.`,
    );
  }

  if (kind === "LOSS" && !note?.trim()) {
    throw new ValidationError(
      "Registe o motivo da perda — é o que permite perceber padrões de desperdício.",
    );
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.material.update({
      where: { id: materialId },
      data: { quantityOnHand: newQuantity },
    });

    await tx.stockMovement.create({
      data: {
        unitId: actor.unitId,
        materialId,
        kind,
        quantity,
        costCents: kind === "PURCHASE" ? material.lastCostCents : 0,
        note: note?.trim() || null,
        createdById: actor.userId,
      },
    });

    await recordAudit(tx, actor, {
      action: "UPDATE",
      entityType: "Material",
      entityId: materialId,
      before: { quantityOnHand: material.quantityOnHand },
      after: { quantityOnHand: newQuantity, kind, note: note?.trim() ?? null },
    });

    return updated;
  });
}

/** Materiais abaixo do mínimo, para o painel e para os alertas. */
export async function lowStockMaterials(actor: Actor) {
  return listMaterials(actor, { lowOnly: true });
}
