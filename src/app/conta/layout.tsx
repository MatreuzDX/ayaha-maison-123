import type { ReactNode } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getClientSession, logoutClient } from "@/server/client-auth";
import { PortalNav } from "./portal-nav";

export const metadata: Metadata = {
  title: { template: "%s · AYAHA MAISON", default: "A minha conta" },
};

/**
 * Casca do Portal da Cliente.
 *
 * Não usa o `(app)/layout.tsx` da equipa — nem o menu, nem a verificação de
 * sessão são os mesmos. A separação de ficheiros espelha a de
 * `client-auth.ts`: é mais fácil auditar que uma cliente nunca vê nada da
 * equipa se os dois mundos nunca partilham layout nem sessão.
 *
 * A navegação só aparece a quem tem sessão E conta aprovada. Quem está à
 * espera de aprovação, ou ainda a registar-se, vê só a página — dar-lhe um
 * menu para secções que vão recusar seria prometer o que não se cumpre.
 */
export default async function ContaLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getClientSession();

  async function signOut() {
    "use server";
    await logoutClient();
    redirect("/login");
  }

  const botaoSair = (
    <form action={signOut}>
      <button
        type="submit"
        className="text-sm text-[var(--text-muted)] hover:text-[var(--text)]"
      >
        Terminar sessão
      </button>
    </form>
  );

  const comNavegacao = Boolean(session?.approved);

  return (
    <div className="min-h-dvh bg-[var(--bg)]">
      <header className="border-b border-[var(--border)] bg-[var(--surface-2)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link
            href="/"
            className="font-[family-name:var(--font-cormorant)] text-lg tracking-wide text-[var(--text)]"
          >
            AYAHA MAISON
          </Link>

          {session ? (
            <div className="flex items-center gap-3">
              <span className="hidden text-sm text-[var(--text-muted)] sm:inline">
                Olá, {session.name}
              </span>
              <span
                aria-hidden
                className="flex size-8 items-center justify-center rounded-full bg-[var(--accent)]/15 text-xs font-medium text-[var(--accent)]"
              >
                {session.name.charAt(0).toUpperCase()}
              </span>
              <div className="hidden lg:block">{botaoSair}</div>
            </div>
          ) : (
            <Link
              href="/login"
              className="text-sm text-[var(--text-muted)] hover:text-[var(--text)]"
            >
              Já tenho conta
            </Link>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-6 lg:py-10">
        {comNavegacao ? (
          <div className="lg:grid lg:grid-cols-[210px_1fr] lg:gap-10">
            <aside className="mb-6 lg:mb-0">
              <PortalNav onSignOut={botaoSair} />
            </aside>
            <main>{children}</main>
          </div>
        ) : (
          <main>{children}</main>
        )}
      </div>
    </div>
  );
}
