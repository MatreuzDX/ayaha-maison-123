"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { IS_DEMO } from "@/lib/demo";
import { login } from "@/server/auth";
import { loginClient } from "@/server/client-auth";
import { AppError } from "@/server/errors";

const schema = z.object({
  email: z.string().trim().min(1, "Indique o e-mail.").email("E-mail inválido."),
  password: z.string().min(1, "Indique a palavra-passe."),
});

export interface LoginState {
  error?: string;
  fieldErrors?: { email?: string; password?: string };
}

/** "/conta/x" continua dentro da zona da cliente; qualquer outra coisa não. */
function isClientPath(path: string): boolean {
  return path.startsWith("/conta");
}

/**
 * Login único: tenta primeiro como equipa, depois como cliente.
 *
 * O sistema decide sozinho para onde mandar cada pessoa — é o que foi
 * pedido: um único formulário, sem escolher "sou cliente" ou "sou equipa".
 *
 * A mensagem de erro quando nenhum dos dois resulta é sempre a mesma, e
 * `login()`/`loginClient()` já fazem trabalho constante mesmo quando o
 * e-mail não existe em cada lado. Isto evita que alguém descubra, pela
 * resposta ou pelo tempo, se um e-mail pertence à equipa, a uma cliente, ou
 * a nenhuma das duas.
 */
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

  const proximoRaw = formData.get("proximo");
  const proximo = typeof proximoRaw === "string" ? proximoRaw : "";

  let destination: string;

  try {
    await login(parsed.data.email, parsed.data.password);
    // Só respeita "proximo" se pertencer à zona certa — senão o próximo
    // pedido seria recusado pelo proxy por falta do cookie de cliente, e a
    // pessoa via um salto confuso em vez de cair logo no sítio certo.
    destination = proximo && !isClientPath(proximo) ? proximo : "/";
  } catch (staffErr) {
    if (!(staffErr instanceof AppError)) {
      console.error("[login:staff]", staffErr);
    }

    try {
      await loginClient(parsed.data.email, parsed.data.password);
      destination = proximo && isClientPath(proximo) ? proximo : "/conta";
    } catch (clientErr) {
      if (clientErr instanceof AppError) return { error: clientErr.message };
      console.error("[login:client]", clientErr);
      return { error: "Não foi possível entrar. Tente novamente." };
    }
  }

  // `redirect` atira internamente — tem de ficar fora do try/catch.
  redirect(destination);
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
