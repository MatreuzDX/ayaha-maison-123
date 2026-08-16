"use client";

import { useEffect } from "react";
import { SITE } from "@/lib/site-config";

/**
 * Último recurso: erro no próprio layout de raiz.
 *
 * Quando isto aparece, o layout de raiz não chegou a renderizar — logo,
 * não há `globals.css`, não há as fontes carregadas por `next/font`, não
 * há tokens de cor. É por isso, e só por isso, que esta página tem os
 * estilos escritos à mão em vez de usar as classes da marca como todas as
 * outras: depender de uma folha de estilos que pode não ter carregado é
 * exactamente o erro que se está a tratar aqui.
 *
 * O contacto já vem do `site-config` como em todo o lado — esse é um
 * módulo de dados puro, sem importações nem efeitos, por isso não é dele
 * que vem o problema. Fixar o número aqui à mão só criava mais um sítio
 * para ficar desactualizado no dia em que mudar.
 *
 * Também traz o seu próprio `<html>` e `<body>` porque substitui o layout
 * de raiz inteiro — é o único ficheiro da aplicação onde isso acontece.
 *
 * Na prática quase nunca dispara. Existe para o caso em que dispara.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Erro fatal no layout de raiz:", error);
  }, [error]);

  return (
    <html lang="pt-PT">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1.5rem",
          padding: "2rem",
          textAlign: "center",
          background: "#0e0e0e",
          color: "#f7f5f1",
          fontFamily: "Georgia, 'Times New Roman', serif",
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: "0.75rem",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "#d8c39a",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          AYAHA MAISON
        </p>

        <h1
          style={{
            margin: 0,
            fontSize: "clamp(1.75rem, 5vw, 2.75rem)",
            fontWeight: 300,
            lineHeight: 1.15,
          }}
        >
          O site está com um problema
        </h1>

        <p
          style={{
            margin: 0,
            maxWidth: "26rem",
            lineHeight: 1.7,
            color: "rgba(247, 245, 241, 0.7)",
            fontFamily: "system-ui, sans-serif",
            fontSize: "0.95rem",
          }}
        >
          Já estamos a tratar disso. Para marcar o seu horário entretanto,
          fale connosco pelo WhatsApp.
        </p>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "0.75rem",
            justifyContent: "center",
          }}
        >
          <button
            type="button"
            onClick={reset}
            style={{
              cursor: "pointer",
              border: "none",
              borderRadius: "999px",
              padding: "0.8rem 1.75rem",
              background: "#c4a870",
              color: "#0e0e0e",
              fontFamily: "system-ui, sans-serif",
              fontSize: "0.9rem",
              fontWeight: 500,
            }}
          >
            Tentar novamente
          </button>

          <a
            href={`https://wa.me/${SITE.whatsapp}`}
            style={{
              borderRadius: "999px",
              padding: "0.8rem 1.75rem",
              border: "1px solid rgba(247, 245, 241, 0.3)",
              color: "#f7f5f1",
              textDecoration: "none",
              fontFamily: "system-ui, sans-serif",
              fontSize: "0.9rem",
            }}
          >
            Falar pelo WhatsApp
          </a>
        </div>

        {error.digest && (
          <p
            style={{
              margin: 0,
              fontSize: "0.7rem",
              color: "rgba(247, 245, 241, 0.35)",
              fontFamily: "ui-monospace, monospace",
            }}
          >
            Código do erro: {error.digest}
          </p>
        )}
      </body>
    </html>
  );
}
