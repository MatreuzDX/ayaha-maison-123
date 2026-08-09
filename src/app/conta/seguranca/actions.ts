"use server";

import { getClientSession } from "@/server/client-auth";
import { changeOwnPassword } from "@/server/client-portal";
import { AppError } from "@/server/errors";

export interface PasswordFormState {
  error?: string;
  success?: boolean;
}

export async function changePasswordAction(
  _prev: PasswordFormState,
  form: FormData,
): Promise<PasswordFormState> {
  const session = await getClientSession();
  if (!session) {
    return { error: "A sua sessão expirou. Entre novamente." };
  }

  const atual = form.get("currentPassword");
  const nova = form.get("newPassword");
  const confirmar = form.get("confirmPassword");

  if (typeof atual !== "string" || !atual) {
    return { error: "Indique a palavra-passe atual." };
  }
  if (typeof nova !== "string" || !nova) {
    return { error: "Indique a palavra-passe nova." };
  }
  if (nova !== confirmar) {
    return { error: "A confirmação não coincide com a palavra-passe nova." };
  }

  try {
    await changeOwnPassword(session.accountId, atual, nova);
  } catch (err) {
    if (err instanceof AppError) return { error: err.message };
    console.error("[changeOwnPassword]", err);
    return { error: "Não foi possível alterar a palavra-passe." };
  }

  // As sessões foram todas fechadas, incluindo esta — quem estiver noutro
  // dispositivo sai. Quem mudou tem de entrar outra vez, o que é o
  // comportamento esperado depois de mudar uma palavra-passe.
  return { success: true };
}
