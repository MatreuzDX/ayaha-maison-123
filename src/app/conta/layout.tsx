import type { ReactNode } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getClientSession, logoutClient } from "@/server/client-auth";

export const metadata: Metadata = {
  title: { template: "%s · AYAHA MAISON", default: "A minha conta" },
};

/**
 * Casca da Área do Cliente.
 *
 * Não usa o `(app)/layout.tsx` da equipa — nem o menu, nem a verificação de
 * sessão são os mesmos. A separação de ficheiros aqui espelha a separação
 * de `client-auth.ts`: mais fácil de auditar que uma cliente nunca vê nada
 * da equipa se os dois mundos nunca partilham layout nem sessão.
 *
 * O cabeçalho olha para a sessão porque `/conta/registar` vive aqui dentro
 * e é pública — mostrar "Sair" a quem ainda nem tem conta seria estranho.
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

  return (
    <div className="min-h-dvh bg-[var(--bg)]">
      <header className="border-b border-[var(--border)] bg-[var(--surface-2)]">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Link
            href="/"
            className="font-[family-name:var(--font-cormorant)] text-lg tracking-wide text-[var(--text)]"
          >
            AYAHA MAISON
          </Link>
          {session ? (
            <form action={signOut}>
              <button
                type="submit"
                className="text-sm text-[var(--text-muted)] hover:text-[var(--text)]"
              >
                Sair
              </button>
            </form>
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

      <main className="mx-auto max-w-3xl px-4 py-8">{children}</main>
    </div>
  );
}
