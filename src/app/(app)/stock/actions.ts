"use server";

import { revalidatePath } from "next/cache";
import { StockMovementKind } from "@prisma/client";
import { requireActor } from "@/server/auth";
import { AppError } from "@/server/errors";
import {
  adjustStock,
  createMaterial,
  deactivateMaterial,
  updateMaterial,
} from "@/server/services/stock.service";

export interface StockFormState {
  error?: string;
  ok?: string;
}

function str(form: FormData, key: string): string | undefined {
  const value = form.get(key);
  if (typeof value !== "string") return undefined;
  return value.trim() || undefined;
}

function numOrZero(form: FormData, key: string): number {
  const raw = str(form, key);
  if (!raw) return 0;
  // Aceita vírgula decimal — é como se escreve em português.
  const parsed = Number(raw.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Lê um valor em euros e devolve cêntimos inteiros. */
function euroToCents(form: FormData, key: string): number {
  const raw = str(form, key);
  if (!raw) return 0;
  const parsed = Number(raw.replace(",", "."));
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.round(parsed * 100);
}

function readMaterial(form: FormData) {
  return {
    name: str(form, "name") ?? "",
    brand: str(form, "brand") ?? null,
    category: str(form, "category") ?? null,
    unit: str(form, "unit") ?? "un",
    quantityOnHand: numOrZero(form, "quantityOnHand"),
    minQuantity: numOrZero(form, "minQuantity"),
    reorderQuantity: numOrZero(form, "reorderQuantity"),
    costCents: euroToCents(form, "cost"),
    sku: str(form, "sku") ?? null,
  };
}

export async function createMaterialAction(
  _prev: StockFormState,
  form: FormData,
): Promise<StockFormState> {
  try {
    const actor = await requireActor();
    await createMaterial(actor, readMaterial(form));
  } catch (err) {
    if (err instanceof AppError) return { error: err.message };
    console.error("[createMaterial]", err);
    return { error: "Não foi possível criar o material." };
  }

  revalidatePath("/stock");
  return { ok: "Material criado." };
}

export async function updateMaterialAction(
  _prev: StockFormState,
  form: FormData,
): Promise<StockFormState> {
  const materialId = form.get("materialId");
  if (typeof materialId !== "string") {
    return { error: "Material não identificado." };
  }

  try {
    const actor = await requireActor();
    await updateMaterial(actor, materialId, readMaterial(form));
  } catch (err) {
    if (err instanceof AppError) return { error: err.message };
    console.error("[updateMaterial]", err);
    return { error: "Não foi possível guardar as alterações." };
  }

  revalidatePath("/stock");
  return { ok: "Material atualizado." };
}

/**
 * Movimenta o stock.
 *
 * O sinal da quantidade vem do tipo de movimento, não de quem preenche: numa
 * compra soma, numa perda subtrai. Pedir "-3" à pessoa seria pedir-lhe para
 * fazer contas com sinais durante o atendimento.
 */
export async function adjustStockAction(
  _prev: StockFormState,
  form: FormData,
): Promise<StockFormState> {
  const materialId = form.get("materialId");
  if (typeof materialId !== "string") {
    return { error: "Material não identificado." };
  }

  const rawKind = str(form, "kind");
  const kind = Object.values(StockMovementKind).includes(
    rawKind as StockMovementKind,
  )
    ? (rawKind as StockMovementKind)
    : null;
  if (!kind) return { error: "Tipo de movimento inválido." };

  const amount = numOrZero(form, "amount");
  if (amount <= 0) {
    return { error: "Indique uma quantidade maior que zero." };
  }

  const subtracts = kind === "CONSUMPTION" || kind === "LOSS" || kind === "TRANSFER";
  const quantity = subtracts ? -amount : amount;

  try {
    const actor = await requireActor();
    await adjustStock(actor, materialId, quantity, kind, str(form, "note"));
  } catch (err) {
    if (err instanceof AppError) return { error: err.message };
    console.error("[adjustStock]", err);
    return { error: "Não foi possível registar o movimento." };
  }

  revalidatePath("/stock");
  return { ok: "Movimento registado." };
}

export async function deactivateMaterialAction(
  _prev: StockFormState,
  form: FormData,
): Promise<StockFormState> {
  const materialId = form.get("materialId");
  if (typeof materialId !== "string") {
    return { error: "Material não identificado." };
  }

  try {
    const actor = await requireActor();
    await deactivateMaterial(actor, materialId);
  } catch (err) {
    if (err instanceof AppError) return { error: err.message };
    console.error("[deactivateMaterial]", err);
    return { error: "Não foi possível desativar o material." };
  }

  revalidatePath("/stock");
  return { ok: "Material desativado." };
}
