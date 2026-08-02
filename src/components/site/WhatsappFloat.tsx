"use client";

import { useEffect, useState } from "react";
import { whatsappLink } from "@/lib/format";
import { SITE, WA_MESSAGES } from "@/lib/site-config";
import { WhatsappIcon } from "./WhatsappButton";

/**
 * Botão flutuante de WhatsApp — faz de "chat de ajuda" do site.
 *
 * Não é um chat novo a construir: é o WhatsApp que já existia, com um balão
 * de saudação que aparece sozinho ao fim de uns segundos, para convidar como
 * um chat convidaria — em vez de ficar parado à espera que alguém repare.
 */
export function WhatsappFloat() {
  const [showBubble, setShowBubble] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowBubble(true), 4000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="fixed right-6 bottom-6 z-[90] flex flex-col items-end gap-2">
      {showBubble && (
        <div className="relative max-w-[220px] rounded-2xl rounded-br-sm bg-[var(--surface-2)] px-4 py-3 text-sm text-[var(--text)] shadow-[0_10px_30px_-8px_rgba(0,0,0,0.35)]">
          <button
            type="button"
            onClick={() => setShowBubble(false)}
            aria-label="Fechar"
            className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--surface)] text-xs text-[var(--text-muted)] shadow"
          >
            ✕
          </button>
          Precisa de ajuda? Fale connosco no WhatsApp — respondemos rapidinho.
          💬
        </div>
      )}

      <a
        href={whatsappLink(SITE.whatsapp, WA_MESSAGES.agendar)}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Precisa de ajuda? Falar no WhatsApp"
        className="group relative flex items-center gap-3 rounded-full bg-[#25D366] px-4 py-3.5 text-white shadow-[0_10px_30px_-8px_rgba(37,211,102,0.7)] transition-all hover:scale-105 hover:bg-[#1fb457]"
      >
        <WhatsappIcon className="h-7 w-7" />
        <span className="hidden max-w-0 overflow-hidden text-sm font-medium whitespace-nowrap transition-all duration-300 group-hover:max-w-[160px] sm:inline">
          Precisa de ajuda?
        </span>
        <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#25D366] opacity-75" />
          <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-[#25D366] ring-2 ring-white" />
        </span>
      </a>
    </div>
  );
}
