import type { Metadata } from "next";
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
  if (await getActor()) redirect("/");
  if (await getClientSession()) redirect("/conta");

  const { proximo } = await searchParams;

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
          <LoginForm proximo={proximo} />
          {IS_DEMO && (
            <DemoLogin email={process.env.SEED_OWNER_EMAIL ?? "demo"} />
          )}
        </div>

        <p className="mt-6 text-center text-xs text-[var(--text-muted)]">
          Entre com o e-mail e a palavra-passe da sua conta. Perdeu a
          palavra-passe? Contacte a administração.
        </p>
      </div>
    </main>
  );
}
