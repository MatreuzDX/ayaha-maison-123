import type { Metadata } from "next";
import Link from "next/link";

/**
 * Página inicial pública — provisória.
 *
 * O layout raiz marca tudo como `noindex` por omissão (é o lado seguro para
 * uma ferramenta interna). Esta é a primeira página pensada para o público,
 * por isso reverte isso explicitamente. As próximas páginas públicas
 * (serviços, sobre, galeria...) precisam do mesmo reforço.
 *
 * O conteúdo a sério — a identidade visual e os textos do site atual —
 * entra na próxima parte desta etapa. Isto existe para `/` nunca ficar sem
 * página depois de o painel da equipa ter passado para `/app`.
 */
export const metadata: Metadata = {
  title: "AYAHA MAISON — Extensão de Pestanas em Lisboa",
  description:
    "Extensão de pestanas ao domicílio, em Lisboa. Atendimento personalizado, com hora marcada.",
  robots: { index: true, follow: true },
};

export default function HomePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-[var(--bg)] px-4 text-center">
      <h1 className="font-[family-name:var(--font-cormorant)] text-4xl tracking-wide text-[var(--text)] md:text-5xl">
        AYAHA MAISON
      </h1>
      <p className="mt-3 max-w-md text-[var(--text-muted)]">
        Extensão de pestanas ao domicílio, em Lisboa.
      </p>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <a
          href="https://wa.me/351933055502"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-11 items-center rounded-[var(--radius)] bg-[var(--accent)] px-5 text-sm font-medium text-[var(--accent-fg)] hover:bg-[var(--accent-hover)]"
        >
          Marcar pelo WhatsApp
        </a>
        <Link
          href="/login"
          className="inline-flex h-11 items-center rounded-[var(--radius)] border border-[var(--border)] px-5 text-sm text-[var(--text)] hover:bg-[var(--surface)]"
        >
          Entrar
        </Link>
      </div>
    </main>
  );
}
