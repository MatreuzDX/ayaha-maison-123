"use server";

import { revalidatePath } from "next/cache";
import { requireActor } from "@/server/auth";
import { AppError } from "@/server/errors";
import {
  createService,
  deactivateService,
  updateService,
} from "@/server/services/service.service";

export interface ServiceFormState {
  error?: string;
  ok?: string;
}

function str(form: FormData, key: string): string | undefined {
  const value = form.get(key);
  if (typeof value !== "string") return undefined;
  return value.trim() || undefined;
}

function int(form: FormData, key: string, fallback = 0): number {
  const raw = str(form, key);
  if (!raw) return fallback;
  const parsed = Number(raw.replace(",", "."));
  return Number.isFinite(parsed) ? Math.round(parsed) : fallback;
}

/** Lê euros e devolve cêntimos inteiros — o dinheiro nunca é Float (ADR-02). */
function euroToCents(form: FormData, key: string): number {
  const raw = str(form, key);
  if (!raw) return 0;
  const parsed = Number(raw.replace(",", "."));
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.round(parsed * 100);
}

function readService(form: FormData) {
  return {
    name: str(form, "name") ?? "",
    categoryId: str(form, "categoryId") ?? "",
    tagline: str(form, "tagline") ?? null,
    description: str(form, "description") ?? null,
    durationMin: int(form, "durationMin"),
    setupMin: int(form, "setupMin", 15),
    teardownMin: int(form, "teardownMin", 5),
    priceCents: euroToCents(form, "price"),
    recommendedGapDays: str(form, "recommendedGapDays")
      ? int(form, "recommendedGapDays")
      : null,
    requiresPatchTest: form.get("requiresPatchTest") === "on",
    isActive: form.get("isActive") !== "off",
  };
}

export async function createServiceAction(
  _prev: ServiceFormState,
  form: FormData,
): Promise<ServiceFormState> {
  try {
    const actor = await requireActor();
    await createService(actor, readService(form));
  } catch (err) {
    if (err instanceof AppError) return { error: err.message };
    console.error("[createService]", err);
    return { error: "Não foi possível criar o serviço." };
  }

  revalidatePath("/servicos");
  return { ok: "Serviço criado." };
}

export async function updateServiceAction(
  _prev: ServiceFormState,
  form: FormData,
): Promise<ServiceFormState> {
  const serviceId = form.get("serviceId");
  if (typeof serviceId !== "string") {
    return { error: "Serviço não identificado." };
  }

  try {
    const actor = await requireActor();
    await updateService(actor, serviceId, readService(form));
  } catch (err) {
    if (err instanceof AppError) return { error: err.message };
    console.error("[updateService]", err);
    return { error: "Não foi possível guardar as alterações." };
  }

  revalidatePath("/servicos");
  return { ok: "Serviço atualizado." };
}

export async function deactivateServiceAction(
  _prev: ServiceFormState,
  form: FormData,
): Promise<ServiceFormState> {
  const serviceId = form.get("serviceId");
  if (typeof serviceId !== "string") {
    return { error: "Serviço não identificado." };
  }

  try {
    const actor = await requireActor();
    await deactivateService(actor, serviceId);
  } catch (err) {
    if (err instanceof AppError) return { error: err.message };
    console.error("[deactivateService]", err);
    return { error: "Não foi possível desativar o serviço." };
  }

  revalidatePath("/servicos");
  return { ok: "Serviço desativado." };
}
