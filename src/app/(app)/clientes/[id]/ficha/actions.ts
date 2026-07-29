"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  EyeShape,
  EyeSpacing,
  EyeTilt,
  FaceShape,
  LashCurl,
  Scale3,
  VisagismGoal,
} from "@prisma/client";
import { requireActor } from "@/server/auth";
import { AppError } from "@/server/errors";
import {
  createMapping,
  duplicateMapping,
  rateRetention,
  saveLashProfile,
  type ZoneInput,
} from "@/server/services/lash.service";
import { ZONE_COUNT } from "@/lib/lash";

export interface LashFormState {
  error?: string;
  ok?: string;
  /** Zonas acima do limite seguro. Aviso, não bloqueio. */
  warning?: string;
}

function str(form: FormData, key: string): string | undefined {
  const value = form.get(key);
  if (typeof value !== "string") return undefined;
  return value.trim() || undefined;
}

function num(form: FormData, key: string): number | null {
  const value = str(form, key);
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Lê um valor de enum vindo do formulário, validando-o.
 *
 * Não basta converter o tipo: o campo vem do browser e pode ser alterado por
 * quem quiser. Um valor inventado passaria pelo TypeScript e só rebentaria no
 * Prisma, com uma mensagem sobre enums que ninguém percebe. Aqui, o que não
 * pertence ao enum vira `null` — que é o valor legítimo de "não definido".
 */
function enumOrNull<T extends Record<string, string>>(
  form: FormData,
  key: string,
  values: T,
): T[keyof T] | null {
  const raw = str(form, key);
  if (!raw) return null;
  return Object.values(values).includes(raw)
    ? (raw as T[keyof T])
    : null;
}

export async function saveProfileAction(
  _prev: LashFormState,
  form: FormData,
): Promise<LashFormState> {
  const clientId = form.get("clientId");
  if (typeof clientId !== "string") {
    return { error: "Cliente não identificada." };
  }

  try {
    const actor = await requireActor();

    await saveLashProfile(actor, clientId, {
      eyeColor: str(form, "eyeColor") ?? null,
      eyeShape: enumOrNull(form, "eyeShape", EyeShape),
      eyeSpacing: enumOrNull(form, "eyeSpacing", EyeSpacing),
      eyeSize: enumOrNull(form, "eyeSize", Scale3),
      eyeTilt: enumOrNull(form, "eyeTilt", EyeTilt),
      faceShape: enumOrNull(form, "faceShape", FaceShape),
      skinTone: str(form, "skinTone") ?? null,
      naturalColor: str(form, "naturalColor") ?? null,
      naturalThicknessMicrons: num(form, "naturalThicknessMicrons"),
      naturalDensity: enumOrNull(form, "naturalDensity", Scale3),
      naturalLengthMm: num(form, "naturalLengthMm"),
      naturalCurl: enumOrNull(form, "naturalCurl", LashCurl),
      growthDirection: str(form, "growthDirection") ?? null,
      lashStrength: enumOrNull(form, "lashStrength", Scale3),
      eyeSensitivity: enumOrNull(form, "eyeSensitivity", Scale3),
      wearsGlasses: form.get("wearsGlasses") === "on",
      goals: form
        .getAll("goals")
        .filter(
          (g): g is VisagismGoal =>
            typeof g === "string" &&
            Object.values(VisagismGoal).includes(g as VisagismGoal),
        ),
      visagismNotes: str(form, "visagismNotes") ?? null,
      wishlist: (str(form, "wishlist") ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    });
  } catch (err) {
    if (err instanceof AppError) return { error: err.message };
    console.error("[saveLashProfile]", err);
    return { error: "Não foi possível guardar a análise." };
  }

  revalidatePath(`/clientes/${clientId}/ficha`);
  return { ok: "Análise guardada." };
}

export async function createMappingAction(
  _prev: LashFormState,
  form: FormData,
): Promise<LashFormState> {
  const clientId = form.get("clientId");
  if (typeof clientId !== "string") {
    return { error: "Cliente não identificada." };
  }

  let warning: string | undefined;

  try {
    const actor = await requireActor();

    // As zonas chegam como um JSON num campo escondido, preenchido pelo
    // diagrama. Enviá-las como campos soltos daria 10 inputs por olho e
    // tornaria o formulário impossível de ler.
    const raw = form.get("zones");
    let zones: ZoneInput[] = [];
    if (typeof raw === "string" && raw) {
      try {
        zones = JSON.parse(raw) as ZoneInput[];
      } catch {
        return { error: "Não foi possível ler o diagrama. Volte a tentar." };
      }
    }
    if (zones.length !== ZONE_COUNT * 2) {
      return {
        error: `O diagrama tem de ter ${ZONE_COUNT} zonas em cada olho.`,
      };
    }

    const result = await createMapping(actor, {
      clientId,
      name: str(form, "name") ?? "",
      curl: enumOrNull(form, "curl", LashCurl),
      thicknessMicrons: num(form, "thicknessMicrons"),
      fanType: str(form, "fanType") ?? null,
      fansPerEye: num(form, "fansPerEye"),
      glueBrand: str(form, "glueBrand") ?? null,
      lashBrand: str(form, "lashBrand") ?? null,
      removerBrand: str(form, "removerBrand") ?? null,
      primerBrand: str(form, "primerBrand") ?? null,
      otherProducts: str(form, "otherProducts") ?? null,
      applicationMin: num(form, "applicationMin"),
      recommendedProducts: str(form, "recommendedProducts") ?? null,
      notes: str(form, "notes") ?? null,
      zones,
    });

    if (result.exceeded > 0 && result.safeLimit) {
      warning =
        `Guardado, mas ${result.exceeded} zona(s) ultrapassam ${result.safeLimit} mm — ` +
        `o limite seguro para a pestana natural desta cliente. Acompanhe a retenção.`;
    }
  } catch (err) {
    if (err instanceof AppError) return { error: err.message };
    console.error("[createMapping]", err);
    return { error: "Não foi possível guardar o mapping." };
  }

  revalidatePath(`/clientes/${clientId}/ficha`);
  revalidatePath(`/clientes/${clientId}`);

  if (warning) return { warning };
  redirect(`/clientes/${clientId}/ficha`);
}

export async function rateRetentionAction(
  _prev: LashFormState,
  form: FormData,
): Promise<LashFormState> {
  const mappingId = form.get("mappingId");
  const clientId = form.get("clientId");
  const stars = Number(form.get("stars"));

  if (typeof mappingId !== "string" || typeof clientId !== "string") {
    return { error: "Mapping não identificado." };
  }

  try {
    const actor = await requireActor();
    await rateRetention(actor, mappingId, stars, str(form, "retentionNote"));
  } catch (err) {
    if (err instanceof AppError) return { error: err.message };
    console.error("[rateRetention]", err);
    return { error: "Não foi possível registar a retenção." };
  }

  revalidatePath(`/clientes/${clientId}/ficha`);
  return { ok: "Retenção registada." };
}

export async function duplicateMappingAction(
  _prev: LashFormState,
  form: FormData,
): Promise<LashFormState> {
  const mappingId = form.get("mappingId");
  const clientId = form.get("clientId");

  if (typeof mappingId !== "string" || typeof clientId !== "string") {
    return { error: "Mapping não identificado." };
  }

  try {
    const actor = await requireActor();
    await duplicateMapping(actor, mappingId);
  } catch (err) {
    if (err instanceof AppError) return { error: err.message };
    console.error("[duplicateMapping]", err);
    return { error: "Não foi possível duplicar o mapping." };
  }

  revalidatePath(`/clientes/${clientId}/ficha`);
  return { ok: "Mapping duplicado para hoje." };
}
