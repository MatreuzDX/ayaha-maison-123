import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { IS_DEMO } from "@/lib/demo";
import { getActor } from "@/server/auth";
import { DemoLogin } from "./demo-login";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Entrar" };

export default async function LoginPage() {
  if (await getActor()) redirect("/");

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[var(--bg)] px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="font-[family-name:var(--font-cormorant)] text-3xl tracking-wide text-[var(--text)]">
            AYAHA MAISON
          </h1>
          <p className="mt-1 text-sm tracking-[0.2em] text-[var(--accent)] uppercase">
            CRM
          </p>
        </div>

        <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-2)] p-6 shadow-sm">
          <LoginForm />
          {IS_DEMO && (
            <DemoLogin email={process.env.SEED_OWNER_EMAIL ?? "demo"} />
          )}
        </div>

        <p className="mt-6 text-center text-xs text-[var(--text-muted)]">
          Acesso reservado à equipa. Perdeu a palavra-passe? Contacte a
          administração.
        </p>
      </div>
    </main>
  );
}
