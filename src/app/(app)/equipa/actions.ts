"use server";

import { revalidatePath } from "next/cache";
import { requireActor } from "@/server/auth";
import { AppError } from "@/server/errors";
import {
  setWorkingHours,
  updateProfessional,
  type WorkingHourInput,
} from "@/server/services/professional.service";

export interface TeamFormState {
  error?: string;
  ok?: string;
}

function str(form: FormData, key: string): string | undefined {
  const value = form.get(key);
  if (typeof value !== "string") return undefined;
  return value.trim() || undefined;
}

export async function updateProfessionalAction(
  _prev: TeamFormState,
  form: FormData,
): Promise<TeamFormState> {
  const professionalId = form.get("professionalId");
  if (typeof professionalId !== "string") {
    return { error: "Profissional não identificada." };
  }

  const maxTravel = str(form, "maxTravelMin");

  try {
    const actor = await requireActor();
    await updateProfessional(actor, professionalId, {
      displayName: str(form, "displayName"),
      bio: str(form, "bio") ?? null,
      color: str(form, "color"),
      isBookable: form.get("isBookable") === "on",
      maxTravelMin: maxTravel ? Number(maxTravel) : undefined,
      hasVehicle: form.get("hasVehicle") === "on",
      transportMode: str(form, "transportMode"),
    });
  } catch (err) {
    if (err instanceof AppError) return { error: err.message };
    console.error("[updateProfessional]", err);
    return { error: "Não foi possível guardar as alterações." };
  }

  revalidatePath("/equipa");
  return { ok: "Dados atualizados." };
}

/**
 * Grava o horário semanal.
 *
 * O formulário envia um par início/fim por dia. Os dias sem horas ficam de
 * fora — é assim que se marca folga: apagando as horas, não com um campo
 * "folga" à parte que depois ninguém se lembra de manter coerente.
 */
export async function setWorkingHoursAction(
  _prev: TeamFormState,
  form: FormData,
): Promise<TeamFormState> {
  const professionalId = form.get("professionalId");
  if (typeof professionalId !== "string") {
    return { error: "Profissional não identificada." };
  }

  const hours: WorkingHourInput[] = [];

  for (let weekday = 0; weekday <= 6; weekday++) {
    const start = str(form, `start-${weekday}`);
    const end = str(form, `end-${weekday}`);
    if (!start || !end) continue;

    const startMin = timeToMinutes(start);
    const endMin = timeToMinutes(end);
    if (startMin === null || endMin === null) {
      return { error: `Hora inválida no dia ${weekday}.` };
    }

    hours.push({ weekday, startMin, endMin });
  }

  try {
    const actor = await requireActor();
    await setWorkingHours(actor, professionalId, hours);
  } catch (err) {
    if (err instanceof AppError) return { error: err.message };
    console.error("[setWorkingHours]", err);
    return { error: "Não foi possível guardar o horário." };
  }

  revalidatePath("/equipa");
  revalidatePath("/agenda");
  return { ok: "Horário guardado." };
}

/** "09:30" → 570 minutos desde a meia-noite. */
function timeToMinutes(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}
