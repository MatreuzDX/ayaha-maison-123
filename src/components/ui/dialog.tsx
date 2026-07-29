"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Diálogo modal.
 *
 * Usa o `<dialog>` nativo em vez de um `div` com posição fixa. O browser trata
 * de tudo o que costuma ser esquecido numa implementação à mão: prender o foco
 * dentro do diálogo, fechar com Esc, esconder o resto da página dos leitores de
 * ecrã e desenhar o fundo. Menos código e mais acessível.
 */
export function Dialog({
  trigger,
  title,
  description,
  children,
  wide = false,
}: {
  trigger: ReactNode;
  title: string;
  description?: string;
  /** Recebe uma função para fechar o diálogo — usar depois de gravar. */
  children: (close: () => void) => ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <>
      <span onClick={() => setOpen(true)}>{trigger}</span>

      <dialog
        ref={ref}
        // O Esc dispara `close` sem passar pelo nosso estado — sem isto, o
        // diálogo fechava mas o React continuava a pensar que estava aberto.
        onClose={() => setOpen(false)}
        onClick={(e) => {
          // Clicar no fundo fecha. O alvo é o próprio <dialog> apenas quando
          // se clica fora do conteúdo.
          if (e.target === ref.current) setOpen(false);
        }}
        className={cn(
          "w-[calc(100vw-2rem)] rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-2)] p-0 text-[var(--text)] backdrop:bg-black/50",
          wide ? "max-w-2xl" : "max-w-md",
        )}
      >
        {open && (
          <div className="max-h-[85vh] overflow-y-auto p-5">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg">{title}</h2>
                {description && (
                  <p className="mt-0.5 text-sm text-[var(--text-muted)]">
                    {description}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fechar"
                className="-mt-1 -mr-1 rounded p-1.5 text-[var(--text-muted)] hover:bg-[var(--surface)] hover:text-[var(--text)]"
              >
                <X size={18} />
              </button>
            </div>

            {children(() => setOpen(false))}
          </div>
        )}
      </dialog>
    </>
  );
}
