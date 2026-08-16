import type { Metadata } from "next";
import Link from "next/link";
import { SITE } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Página não encontrada — AYAHA MAISON",
};

/**
 * 404 de raiz — apanha qualquer endereço que não corresponda a nada.
 *
 * Vive na raiz e não em `(site)` de propósito: o Next só usa o
 * `not-found` de um grupo para chamadas a `notFound()` DE DENTRO desse
 * grupo. Um endereço inventado (`/promocao-2024`) nunca chega lá — cai
 * aqui. Como o layout de raiz não tem cabeçalho nem rodapé (vivem em
 * `(site)/layout.tsx`), esta página traz a sua própria moldura e a classe
 * `site-light`, que é onde as cores da marca estão definidas.
 *
 * Quem aterra aqui costuma vir de um link partilhado que mudou ou de um
 * engano a escrever. O trabalho da página é não ser um beco: dar o
 * caminho de volta e, sobretudo, a forma de marcar — que é o que a pessoa
 * provavelmente vinha fazer.
 */
export default function NotFound() {
  return (
    <div className="site-light bg-onyx flex min-h-screen flex-col items-center justify-center px-6 py-20 text-center">
      <p className="text-gold-light text-xs font-medium tracking-[0.2em] uppercase">
        Página não encontrada
      </p>

      <h1 className="heading-serif text-ivory mt-6 text-4xl md:text-6xl">
        Este endereço
        <br />
        <span className="text-gold italic">não existe</span>
      </h1>

      <div className="from-gold mt-8 h-px w-16 bg-gradient-to-r to-transparent" />

      <p className="text-ivory/70 mt-8 max-w-md leading-relaxed">
        A página que procurava foi movida ou nunca existiu. Acontece — e não
        é preciso ficar por aqui.
      </p>

      <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
        <Link href="/" className="btn-gold">
          Voltar ao início
        </Link>
        <Link
          href="/servicos"
          className="btn-outline border-ivory/30 text-ivory hover:text-gold-light"
        >
          Ver serviços
        </Link>
      </div>

      <p className="text-ivory/45 mt-12 text-sm">
        Ou fale connosco directamente pelo{" "}
        <a
          href={`https://wa.me/${SITE.whatsapp}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-gold-light underline underline-offset-4 hover:opacity-80"
        >
          WhatsApp
        </a>
        .
      </p>
    </div>
  );
}
