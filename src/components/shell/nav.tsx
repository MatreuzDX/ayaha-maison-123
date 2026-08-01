"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  CalendarDays,
  ClipboardList,
  Euro,
  LayoutDashboard,
  Megaphone,
  Package,
  Settings,
  Sparkles,
  Users,
  UsersRound,
} from "lucide-react";
import { MOBILE_HREFS, type NavIcon, type NavItem } from "./nav-items";
import { cn } from "@/lib/utils";

const ICONS: Record<NavIcon, typeof LayoutDashboard> = {
  dashboard: LayoutDashboard,
  agenda: CalendarDays,
  clientes: Users,
  atendimentos: ClipboardList,
  equipa: UsersRound,
  servicos: Sparkles,
  stock: Package,
  financeiro: Euro,
  marketing: Megaphone,
  relatorios: BarChart3,
  definicoes: Settings,
};

function isActive(pathname: string, href: string): boolean {
  return href === "/app" ? pathname === "/app" : pathname.startsWith(href);
}

export function SidebarNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Navegação principal" className="flex flex-col gap-0.5 p-2">
      {items.map((item) => {
        const Icon = ICONS[item.icon];
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-[var(--radius)] px-3 py-2.5 text-sm transition-colors",
              active
                ? "bg-[var(--accent)]/15 font-medium text-[var(--text)]"
                : "text-[var(--text-muted)] hover:bg-[var(--surface)] hover:text-[var(--text)]",
            )}
          >
            <Icon
              size={18}
              className={active ? "text-[var(--accent)]" : undefined}
              aria-hidden="true"
            />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Barra inferior em mobile. Só os destinos mais usados no terreno. */
export function MobileNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const primary = items
    .filter((i) => MOBILE_HREFS.includes(i.href))
    .slice(0, 5);

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-40 flex border-t border-[var(--border)] bg-[var(--surface-2)] md:hidden"
    >
      {primary.map((item) => {
        const Icon = ICONS[item.icon];
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px]",
              active ? "text-[var(--accent)]" : "text-[var(--text-muted)]",
            )}
          >
            <Icon size={20} aria-hidden="true" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
