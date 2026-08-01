"use client";

import { whatsappLink } from "@/lib/format";
import { SITE, WA_MESSAGES } from "@/lib/site-config";
import { WhatsappIcon } from "./WhatsappButton";

/** Botão flutuante de WhatsApp, visível em todas as páginas públicas. */
export function WhatsappFloat() {
  return (
    <a
      href={whatsappLink(SITE.whatsapp, WA_MESSAGES.agendar)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Falar no WhatsApp"
      className="group fixed right-6 bottom-6 z-[90] flex items-center gap-3 rounded-full bg-[#25D366] px-4 py-3.5 text-white shadow-[0_10px_30px_-8px_rgba(37,211,102,0.7)] transition-all hover:scale-105 hover:bg-[#1fb457]"
    >
      <WhatsappIcon className="h-7 w-7" />
      <span className="hidden max-w-0 overflow-hidden text-sm font-medium whitespace-nowrap transition-all duration-300 group-hover:max-w-[160px] sm:inline">
        Fale connosco
      </span>
      <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#25D366] opacity-75" />
        <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-[#25D366] ring-2 ring-white" />
      </span>
    </a>
  );
}
