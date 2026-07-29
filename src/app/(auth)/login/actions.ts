"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { IS_DEMO } from "@/lib/demo";
import { login } from "@/server/auth";
import { AppError } from "@/server/errors";

const schema = z.object({
  email: z.string().trim().min(1, "Indique o e-mail.").email("E-mail inválido."),
  password: z.string().min(1, "Indique a palavra-passe."),
});

export interface LoginState {
  error?: string;
  fieldErrors?: { email?: string; password?: string };
}

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = schema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    const flat = z.flattenError(parsed.error);
    return {
      fieldErrors: {
        email: flat.fieldErrors.email?.[0],
        password: flat.fieldErrors.password?.[0],
      },
    };
  }

  try {
    await login(parsed.data.email, parsed.data.password);
  } catch (err) {
    if (err instanceof AppError) return { error: err.message };
    console.error("[login]", err);
    return { error: "Não foi possível entrar. Tente novamente." };
  }

  // `redirect` atira internamente — tem de ficar fora do try/catch.
  redirect("/");
}

/**
 * Entrada rápida — APENAS EM DEMONSTRAÇÃO.
 *
 * Não é um bypass de autenticação: continua a fazer o login normal, com
 * verificação Argon2id da palavra-passe. A única coisa que faz é preencher as
 * credenciais de teste por nós.
 *
 * Em produção `IS_DEMO` é sempre falso e esta ação recusa. E se alguém tentar
 * publicar com `DEMO_MODE=true`, a aplicação nem sequer arranca (ver
 * `src/lib/demo.ts`).
 */
export async function demoLoginAction(): Promise<LoginState> {
  if (!IS_DEMO) {
    return { error: "Entrada rápida indisponível." };
  }

  const email = process.env.SEED_OWNER_EMAIL;
  const password = process.env.SEED_OWNER_PASSWORD;

  if (!email || !password) {
    return {
      error:
        "Credenciais de demonstração não configuradas (SEED_OWNER_EMAIL / SEED_OWNER_PASSWORD).",
    };
  }

  try {
    await login(email, password);
  } catch (err) {
    if (err instanceof AppError) return { error: err.message };
    console.error("[demoLogin]", err);
    return { error: "Não foi possível entrar." };
  }

  redirect("/");
}
