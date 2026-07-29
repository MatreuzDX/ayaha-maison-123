"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireActor } from "@/server/auth";
import { AppError } from "@/server/errors";
import {
  cancelAppointment,
  completeAppointment,
  createAppointment,
} from "@/server/services/appointment.service";

export interface AppointmentFormState {
  error?: string;
}

export async function createAppointmentAction(
  _prev: AppointmentFormState,
  form: FormData,
): Promise<AppointmentFormState> {
  try {
    const actor = await requireActor();

    const clientId = form.get("clientId");
    const professionalId = form.get("professionalId");
    const date = form.get("date");
    const time = form.get("time");
    const serviceIds = form.getAll("serviceIds").filter(
      (v): v is string => typeof v === "string",
    );

    if (
      typeof clientId !== "string" ||
      typeof professionalId !== "string" ||
      typeof date !== "string" ||
      typeof time !== "string"
    ) {
      return { error: "Preencha a cliente, a profissional, a data e a hora." };
    }

    // O input datetime-local devolve hora local de Lisboa. Construir a data
    // desta forma faz o browser aplicar o fuso do sistema — que é o de Lisboa
    // para quem usa o sistema. Para agendamento remoto isto teria de ser
    // explícito, mas a AYAHA opera só em Lisboa.
    const startAt = new Date(`${date}T${time}`);
    if (Number.isNaN(startAt.getTime())) {
      return { error: "Data ou hora inválida." };
    }

    await createAppointment(actor, {
      clientId,
      professionalId,
      serviceIds,
      startAt,
      clientNotes: (form.get("clientNotes") as string)?.trim() || null,
      internalNotes: (form.get("internalNotes") as string)?.trim() || null,
    });
  } catch (err) {
    if (err instanceof AppError) return { error: err.message };
    console.error("[createAppointment]", err);
    return { error: "Não foi possível criar a marcação. Tente novamente." };
  }

  revalidatePath("/agenda");
  revalidatePath("/");
  redirect("/agenda");
}

export async function cancelAppointmentAction(
  _prev: AppointmentFormState,
  form: FormData,
): Promise<AppointmentFormState> {
  const appointmentId = form.get("appointmentId");
  const reason = form.get("reason");

  if (typeof appointmentId !== "string") {
    return { error: "Marcação não identificada." };
  }

  try {
    const actor = await requireActor();
    await cancelAppointment(
      actor,
      appointmentId,
      typeof reason === "string" ? reason : "",
    );
  } catch (err) {
    if (err instanceof AppError) return { error: err.message };
    console.error("[cancelAppointment]", err);
    return { error: "Não foi possível cancelar a marcação." };
  }

  revalidatePath("/agenda");
  revalidatePath("/atendimentos");
  return {};
}

export async function completeAppointmentAction(
  _prev: AppointmentFormState,
  form: FormData,
): Promise<AppointmentFormState> {
  const appointmentId = form.get("appointmentId");

  if (typeof appointmentId !== "string") {
    return { error: "Marcação não identificada." };
  }

  try {
    const actor = await requireActor();
    await completeAppointment(actor, appointmentId);
  } catch (err) {
    if (err instanceof AppError) return { error: err.message };
    console.error("[completeAppointment]", err);
    return { error: "Não foi possível concluir o atendimento." };
  }

  revalidatePath("/agenda");
  revalidatePath("/atendimentos");
  revalidatePath("/");
  return {};
}
