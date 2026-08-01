import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { logout, requireActorPage } from "@/server/auth";
import { can, ROLE_LABELS } from "@/server/permissions";
import { MobileNav, SidebarNav } from "@/components/shell/nav";
import { NAV_ITEMS } from "@/components/shell/nav-items";
import { prisma } from "@/server/db";
import { initials } from "@/lib/format";

export const metadata: Metadata = {
  title: { template: "%s · AYAHA CRM", default: "AYAHA CRM" },
};

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const actor = await requireActorPage();

  // Filtrado no servidor: um papel restrito nunca recebe sequer os links das
  // secções a que não tem acesso.
  const items = NAV_ITEMS.filter((item) => can(actor, item.permission));

  const [user, unit] = await Promise.all([
    prisma.user.findUnique({
      where: { id: actor.userId },
      select: { name: true, email: true },
    }),
    prisma.unit.findUnique({
      where: { id: actor.unitId },
      select: { name: true },
    }),
  ]);

  async function signOut() {
    "use server";
    await logout();
    redirect("/login");
  }

  const displayName = user?.name ?? "Utilizador";

  return (
    <div className="flex min-h-dvh bg-[var(--bg)]">
      {/* Sidebar — desktop */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-[var(--border)] bg-[var(--surface-2)] md:flex">
        <div className="border-b border-[var(--border)] px-4 py-4">
          <p className="font-[family-name:var(--font-cormorant)] text-lg leading-tight tracking-wide">
            AYAHA MAISON
          </p>
          <p className="text-[11px] tracking-[0.18em] text-[var(--accent)] uppercase">
            CRM
          </p>
        </div>

        <div className="flex-1 overflow-y-auto">
          <SidebarNav items={items} />
        </div>

        <div className="border-t border-[var(--border)] p-3">
          <div className="mb-2 flex items-center gap-2.5">
            <div
              className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--accent)]/20 text-xs font-medium text-[var(--text)]"
              aria-hidden="true"
            >
              {initials(displayName)}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{displayName}</p>
              <p className="truncate text-xs text-[var(--text-muted)]">
                {ROLE_LABELS[actor.role]}
              </p>
            </div>
          </div>
          <form action={signOut}>
            <button
              type="submit"
              className="w-full rounded-[var(--radius)] px-2 py-1.5 text-left text-xs text-[var(--text-muted)] transition-colors hover:bg-[var(--surface)] hover:text-[var(--text)]"
            >
              Terminar sessão
            </button>
          </form>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b border-[var(--border)] bg-[var(--surface-2)] px-4">
          <p className="truncate text-sm text-[var(--text-muted)]">
            {unit?.name ?? "AYAHA MAISON"}
          </p>
          <div className="flex items-center gap-3 md:hidden">
            <span className="text-sm font-medium">{displayName}</span>
            <form action={signOut}>
              <button
                type="submit"
                className="text-xs text-[var(--text-muted)] underline"
              >
                Sair
              </button>
            </form>
          </div>
        </header>

        {/* pb-20 em mobile deixa espaço para a barra inferior */}
        <main className="flex-1 overflow-x-hidden p-4 pb-20 md:p-6 md:pb-6">
          {children}
        </main>
      </div>

      <MobileNav items={items} />
    </div>
  );
}
