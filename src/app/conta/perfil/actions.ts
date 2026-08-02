"use server";

import { revalidatePath } from "next/cache";
import { getClientSession } from "@/server/client-auth";
import { updateOwnProfile } from "@/server/client-portal";
import { AppError } from "@/server/errors";

export interface ProfileFormState {
  error?: string;
  success?: boolean;
}

function text(form: FormData, key: string): string | undefined {
  const value = form.get(key);
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

export async function updateProfileAction(
  _prev: ProfileFormState,
  form: FormData,
): Promise<ProfileFormState> {
  // Não usa `requireClientPage()` — numa Server Action, o `redirect()` dela
  // devolvia um 303 mudo para /login e a pessoa perdia o que tinha escrito
  // sem perceber porquê. Melhor dizer o que se passou e deixar o formulário
  // preenchido.
  const session = await getClientSession();
  if (!session) {
    return { error: "A sua sessão expirou. Entre novamente para guardar." };
  }

  try {
    await updateOwnProfile(session.clientId, session.unitId, {
      firstName: text(form, "firstName") ?? "",
      lastName: text(form, "lastName") ?? null,
      phone: text(form, "phone") ?? "",
      addressLine: text(form, "addressLine") ?? null,
      addressExtra: text(form, "addressExtra") ?? null,
      postalCode: text(form, "postalCode") ?? null,
      city: text(form, "city") ?? null,
      accessNotes: text(form, "accessNotes") ?? null,
      parkingNotes: text(form, "parkingNotes") ?? null,
    });
  } catch (err) {
    if (err instanceof AppError) return { error: err.message };
    console.error("[updateOwnProfile]", err);
    return { error: "Não foi possível guardar as alterações." };
  }

  revalidatePath("/conta/perfil");
  revalidatePath("/conta");
  return { success: true };
}
