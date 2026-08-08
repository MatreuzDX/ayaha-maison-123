"use server";

import { revalidatePath } from "next/cache";
import { getClientSession } from "@/server/client-auth";
import {
  listAvailableSlots,
  listBookableProfessionals,
  requestAppointment,
  type BookableProfessional,
} from "@/server/client-booking";
import { AppError } from "@/server/errors";

/**
 * Server Actions da auto-marcação.
 *
 * Nenhuma delas aceita um `clientId` — vem sempre da sessão. É o que
 * impede alguém de marcar em nome de outra pessoa mexendo no que envia.
 */

export interface ProfessionalsResult {
  error?: string;
  professionals?: BookableProfessional[];
}

export async function professionalsForServiceAction(
  serviceId: string,
): Promise<ProfessionalsResult> {
  const session = await getClientSession();
  if (!session) return { error: "A sua sessão expirou. Entre novamente." };

  try {
    return {
      professionals: await listBookableProfessionals(session.unitId, serviceId),
    };
  } catch (err) {
    if (err instanceof AppError) return { error: err.message };
    console.error("[professionalsForService]", err);
    return { error: "Não foi possível carregar as profissionais." };
  }
}

export interface SlotsResult {
  error?: string;
  slots?: string[];
}

export async function slotsForDayAction(input: {
  serviceId: string;
  professionalId: string;
  day: string;
}): Promise<SlotsResult> {
  const session = await getClientSession();
  if (!session) return { error: "A sua sessão expirou. Entre novamente." };

  try {
    return {
      slots: await listAvailableSlots({
        unitId: session.unitId,
        clientId: session.clientId,
        professionalId: input.professionalId,
        serviceId: input.serviceId,
        day: input.day,
      }),
    };
  } catch (err) {
    if (err instanceof AppError) return { error: err.message };
    console.error("[slotsForDay]", err);
    return { error: "Não foi possível carregar as horas livres." };
  }
}

export interface ConfirmResult {
  error?: string;
  /** Preenchido quando correu bem — é o que a página mostra no fim. */
  booked?: {
    code: string;
    startAt: string;
    serviceName: string;
    professionalName: string;
  };
}

export async function confirmBookingAction(input: {
  serviceId: string;
  professionalId: string;
  startAt: string;
  notes?: string;
}): Promise<ConfirmResult> {
  const session = await getClientSession();
  if (!session) return { error: "A sua sessão expirou. Entre novamente." };

  try {
    const created = await requestAppointment(session, input);

    revalidatePath("/conta");
    revalidatePath("/app/agenda");

    return {
      booked: {
        code: created.code,
        startAt: created.startAt.toISOString(),
        serviceName: created.items[0]?.nameSnapshot ?? "",
        professionalName: created.professionalName,
      },
    };
  } catch (err) {
    if (err instanceof AppError) return { error: err.message };
    console.error("[requestAppointment]", err);
    return { error: "Não foi possível concluir a marcação. Tente novamente." };
  }
}
