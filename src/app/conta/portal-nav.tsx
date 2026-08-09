"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Navegação do portal da cliente.
 *
 * Desktop: coluna discreta à esquerda.
 * Telemóvel: uma barra com o item atual que abre para baixo. Não fica uma
 * coluna fixa a roubar largura — num ecrã de 375px isso deixava o conteúdo
 * espremido, e é no telemóvel que a maioria das clientes entra.
 */

const ITEMS = [
  { href: "/conta", label: "Início", icon: IconCasa },
  { href: "/conta/marcacoes", label: "Marcações", icon: IconAgenda },
  { href: "/conta/historico", label: "Histórico", icon: IconRelogio },
  { href: "/conta/beneficios", label: "Benefícios", icon: IconPresente },
  { href: "/conta/perfil", label: "O meu perfil", icon: IconPessoa },
  { href: "/conta/seguranca", label: "Segurança", icon: IconCadeado },
] as const;

function ativo(pathname: string, href: string) {
  // "/conta" só fica ativo no próprio; os outros também nas suas subpáginas.
  return href === "/conta" ? pathname === href : pathname.startsWith(href);
}

export function PortalNav({ onSignOut }: { onSignOut: React.ReactNode }) {
  const pathname = usePathname();
  const [aberto, setAberto] = useState(false);
  const atual = ITEMS.find((i) => ativo(pathname, i.href)) ?? ITEMS[0];

  return (
    <>
      {/* ── Telemóvel ── */}
      <div className="lg:hidden">
        <button
          type="button"
          onClick={() => setAberto((v) => !v)}
          aria-expanded={aberto}
          className="flex w-full items-center justify-between rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-left"
        >
          <span className="flex items-center gap-3 text-sm font-medium text-[var(--text)]">
            <atual.icon />
            {atual.label}
          </span>
          <svg
            viewBox="0 0 24 24"
            className={`h-4 w-4 text-[var(--text-muted)] transition-transform ${aberto ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            aria-hidden
          >
            <path d="m6 9 6 6 6-6" strokeLinecap="round" />
          </svg>
        </button>

        {aberto && (
          <nav
            aria-label="Secções da conta"
            className="mt-2 overflow-hidden rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-2)]"
          >
            {ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setAberto(false)}
                className={`flex items-center gap-3 border-b border-[var(--border)] px-4 py-3 text-sm last:border-b-0 ${
                  ativo(pathname, item.href)
                    ? "bg-[var(--accent)]/10 text-[var(--accent)]"
                    : "text-[var(--text-muted)]"
                }`}
              >
                <item.icon />
                {item.label}
              </Link>
            ))}
            <div className="border-t border-[var(--border)] px-4 py-3">
              {onSignOut}
            </div>
          </nav>
        )}
      </div>

      {/* ── Desktop ── */}
      <nav
        aria-label="Secções da conta"
        className="hidden lg:flex lg:flex-col lg:gap-1"
      >
        {ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 rounded-[var(--radius)] px-3 py-2.5 text-sm transition-colors ${
              ativo(pathname, item.href)
                ? "bg-[var(--accent)]/10 font-medium text-[var(--accent)]"
                : "text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
            }`}
          >
            <item.icon />
            {item.label}
          </Link>
        ))}
        <div className="mt-2 border-t border-[var(--border)] px-3 pt-3">
          {onSignOut}
        </div>
      </nav>
    </>
  );
}

/* Ícones de traço, desenhados à mão — sem biblioteca, para não destoarem
   da leveza do resto da marca. */

const svg = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: "1.4",
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  className: "h-[18px] w-[18px] shrink-0",
  "aria-hidden": true,
};

function IconCasa() {
  return (
    <svg {...svg}>
      <path d="M3.5 10.6 12 4l8.5 6.6" />
      <path d="M5.9 9.4V19a.9.9 0 0 0 .9.9h10.4a.9.9 0 0 0 .9-.9V9.4" />
    </svg>
  );
}
function IconAgenda() {
  return (
    <svg {...svg}>
      <rect x="3.6" y="5.6" width="16.8" height="14.8" rx="2.2" />
      <path d="M8.2 3.4v4M15.8 3.4v4M3.6 10.2h16.8" />
    </svg>
  );
}
function IconRelogio() {
  return (
    <svg {...svg}>
      <circle cx="12" cy="12" r="8.4" />
      <path d="M12 7.4V12l3 1.8" />
    </svg>
  );
}
function IconPresente() {
  return (
    <svg {...svg}>
      <rect x="3.6" y="9.4" width="16.8" height="11" rx="1.6" />
      <path d="M3.6 13.4h16.8M12 9.4v11" />
      <path d="M12 9.4S9.6 4 7.4 5.4C5.6 6.6 7 9.4 12 9.4Zm0 0s2.4-5.4 4.6-4c1.8 1.2.4 4-4.6 4Z" />
    </svg>
  );
}
function IconPessoa() {
  return (
    <svg {...svg}>
      <circle cx="12" cy="8.4" r="3.6" />
      <path d="M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6" />
    </svg>
  );
}
function IconCadeado() {
  return (
    <svg {...svg}>
      <rect x="5" y="10.4" width="14" height="9.6" rx="2" />
      <path d="M8.4 10.4V7.8a3.6 3.6 0 0 1 7.2 0v2.6" />
    </svg>
  );
}
