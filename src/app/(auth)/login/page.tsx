import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { IS_DEMO } from "@/lib/demo";
import { getActor } from "@/server/auth";
import { getClientSession } from "@/server/client-auth";
import { DemoLogin } from "./demo-login";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Entrar" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  // Um único login para os dois mundos: se já houver sessão de equipa ou de
  // cliente, não mostra o formulário outra vez — manda logo para o sítio
  // certo. As duas verificações são independentes por natureza dos cookies
  // terem nomes diferentes; nunca as duas são verdadeiras ao mesmo tempo.
  if (await getActor()) redirect("/app");
  if (await getClientSession()) redirect("/conta");

  const { proximo, erro } = await searchParams;

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[var(--bg)] px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="font-[family-name:var(--font-cormorant)] text-3xl tracking-wide text-[var(--text)]">
            AYAHA MAISON
          </h1>
          <p className="mt-1 text-sm tracking-[0.2em] text-[var(--accent)] uppercase">
            Entrar
          </p>
        </div>

        <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-2)] p-6 shadow-sm">
          {/* O retorno do Google manda para aqui com ?erro=google quando algo
              falha (cancelou, conta recusada, sessão expirada). Sem esta
              mensagem a pessoa voltava ao login sem saber porquê. */}
          {erro === "google" && (
            <div
              role="alert"
              className="mb-4 rounded-[var(--radius)] border border-[var(--danger)] bg-[var(--danger-bg)] px-3 py-2.5 text-sm text-[var(--danger)]"
            >
              Não foi possível entrar com o Google. Tente outra vez ou use o
              e-mail e a palavra-passe.
            </div>
          )}
          <LoginForm proximo={proximo} />
          {IS_DEMO && (
            <DemoLogin email={process.env.SEED_OWNER_EMAIL ?? "demo"} />
          )}
        </div>

        <p className="mt-6 text-center text-sm text-[var(--text-muted)]">
          Ainda não é cliente?{" "}
          <Link href="/conta/registar" className="text-[var(--accent)] hover:underline">
            Criar conta
          </Link>
        </p>

        <p className="mt-3 text-center text-xs text-[var(--text-muted)]">
          Equipa: perdeu a palavra-passe? Contacte a administração.
        </p>
      </div>
    </main>
  );
}
