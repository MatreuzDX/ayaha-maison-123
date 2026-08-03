"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "./Logo";
import { NAV, SITE, WA_MESSAGES } from "@/lib/site-config";
import { whatsappLink } from "@/lib/format";

/**
 * Cabeçalho do site público.
 *
 * `loggedIn` vem do servidor (o layout já sabe, via `getClientSession()`) —
 * não há aqui nenhum contexto de autenticação do lado do cliente a fingir
 * que sabe quem está autenticado. O carrinho fica para quando a loja for
 * ligada (Etapa 5); até lá, sem ícone de carrinho — mostrar uma contagem que
 * nunca muda seria pior do que não mostrar nada.
 */
export function Header({ loggedIn }: { loggedIn: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Fecha o menu mobile ao navegar. Ajustado durante o render (não num
  // efeito): compara com o pathname da última renderização e, se mudou,
  // atualiza os dois estados já nesta passagem — evita o instante em que o
  // menu antigo ainda apareceria aberto por cima da página nova.
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setOpen(false);
  }

  const accountHref = loggedIn ? "/conta" : "/login";

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-pearl/90 shadow-[0_1px_0_rgba(0,0,0,0.06)] backdrop-blur-md"
          : "bg-transparent"
      }`}
    >
      <div className="container-luxe flex items-center justify-between py-4">
        <nav
          className="hidden flex-1 items-center gap-7 lg:flex"
          aria-label="Principal"
        >
          {NAV.slice(0, 4).map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              active={pathname === item.href}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex-1 lg:flex-none lg:text-center">
          <Logo />
        </div>

        <div className="flex flex-1 items-center justify-end gap-5">
          <nav
            className="hidden items-center gap-7 lg:flex"
            aria-label="Secundária"
          >
            {NAV.slice(4).map((item) => (
              <NavLink
                key={item.href}
                href={item.href}
                active={pathname === item.href}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <Link
            href={accountHref}
            aria-label="Área do cliente"
            className="text-onyx/70 hover:text-gold-deep hidden transition md:block"
          >
            <UserIcon />
          </Link>

          <button
            onClick={() => setOpen((v) => !v)}
            className="text-onyx lg:hidden"
            aria-label="Abrir menu"
            aria-expanded={open}
          >
            {open ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>
      </div>

      <div
        className={`border-onyx/5 bg-pearl overflow-hidden border-t transition-[max-height] duration-500 lg:hidden ${
          open ? "max-h-[520px]" : "max-h-0"
        }`}
      >
        <nav
          className="container-luxe flex flex-col gap-1 py-4"
          aria-label="Menu mobile"
        >
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`border-onyx/5 border-b py-3 text-sm tracking-[0.15em] uppercase transition ${
                pathname === item.href
                  ? "text-gold-deep"
                  : "text-onyx/70 hover:text-onyx"
              }`}
            >
              {item.label}
            </Link>
          ))}
          {/* Enquanto a cliente não puder marcar sozinha no site, o botão tem
              de levar a algum lado onde ela consiga mesmo marcar — o WhatsApp.
              Apontava para /agendamento, que nunca existiu nesta app. */}
          <a
            href={whatsappLink(SITE.whatsapp, WA_MESSAGES.agendar)}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-gold mt-4"
          >
            Agendar horário
          </a>
          <Link href={accountHref} className="btn-outline mt-2">
            {loggedIn ? "A minha conta" : "Entrar"}
          </Link>
        </nav>
      </div>
    </header>
  );
}

function NavLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`link-underline text-xs tracking-[0.18em] uppercase transition-colors ${
        active ? "text-gold-deep" : "text-onyx/70 hover:text-onyx"
      }`}
    >
      {children}
    </Link>
  );
}

function UserIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      aria-hidden
    >
      <circle cx="12" cy="8" r="3.4" />
      <path d="M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6" strokeLinecap="round" />
    </svg>
  );
}
function MenuIcon() {
  return (
    <svg
      width="26"
      height="26"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      aria-hidden
    >
      <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
    </svg>
  );
}
function CloseIcon() {
  return (
    <svg
      width="26"
      height="26"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      aria-hidden
    >
      <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
    </svg>
  );
}
