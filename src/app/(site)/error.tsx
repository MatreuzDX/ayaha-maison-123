"use client";

import { useEffect } from "react";
import Link from "next/link";
import { SITE } from "@/lib/site-config";

/**
 * Erro no site público.
 *
 * Uma cliente que vem marcar e apanha um erro não quer saber o que
 * rebentou — quer marcar na mesma. Por isso a página não mostra a
 * mensagem técnica (que não lhe diz nada e pode revelar estrutura interna
 * do servidor): dá o botão de tentar outra vez e, ao lado, o WhatsApp, que
 * funciona mesmo com o site em baixo.
 *
 * O `digest` é a única coisa técnica que aparece, e só quando existe: é o
 * código que o Next gera em produção para ligar este erro à linha certa
 * dos registos do servidor. Se alguém o mencionar numa mensagem, dá para
 * encontrar o problema exacto em vez de adivinhar.
 */
export default function SiteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Deixa o erro completo na consola do browser — para quem está a
    // desenvolver, não para quem está a visitar.
    console.error("Erro no site público:", error);
  }, [error]);

  return (
    <div className="container-luxe flex flex-col items-center py-24 text-center md:py-32">
      <p className="eyebrow">Algo correu mal</p>

      <h1 className="heading-serif text-onyx mt-4 text-4xl md:text-5xl">
        Não foi possível
        <br />
        mostrar esta página
      </h1>

      <div className="gold-divider mt-6" />

      <p className="text-onyx/60 mt-8 max-w-md leading-relaxed">
        O problema é nosso, não seu. Tente novamente — e se continuar,
        estamos a um WhatsApp de distância para marcar consigo à mesma.
      </p>

      <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
        <button type="button" onClick={reset} className="btn-gold">
          Tentar novamente
        </button>
        <a
          href={`https://wa.me/${SITE.whatsapp}`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-outline"
        >
          Falar pelo WhatsApp
        </a>
      </div>

      <Link
        href="/"
        className="text-onyx/50 hover:text-gold-deep mt-10 text-sm underline underline-offset-4"
      >
        Voltar ao início
      </Link>

      {error.digest && (
        <p className="text-onyx/35 mt-8 font-mono text-xs">
          Código do erro: {error.digest}
        </p>
      )}
    </div>
  );
}
