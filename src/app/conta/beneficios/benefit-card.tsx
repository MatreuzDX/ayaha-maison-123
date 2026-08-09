"use client";

import { useState } from "react";
import type { PortalBenefit } from "@/server/client-portal";

/**
 * Um benefício, com o código à mão.
 *
 * O botão de copiar existe porque o código é apresentado no atendimento e
 * escrever-lo à mão de um telemóvel é onde se enganam letras.
 */
export function BenefitCard({ benefit }: { benefit: PortalBenefit }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    if (!benefit.code) return;
    try {
      await navigator.clipboard.writeText(benefit.code);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      // Sem permissão para a área de transferência — o código continua
      // visível, que é o que importa.
    }
  }

  return (
    <div className="rounded-[var(--radius)] border border-[var(--accent)]/30 bg-[var(--surface-2)] p-6">
      <p className="text-[0.68rem] tracking-[0.14em] text-[var(--accent)] uppercase">
        {benefit.origin === "recompensa" ? "Recompensa AYAHA Club" : "Cupão"}
      </p>

      <p className="mt-2 font-[family-name:var(--font-cormorant)] text-2xl text-[var(--text)]">
        {benefit.title}
      </p>

      {benefit.description && (
        <p className="mt-1.5 text-sm text-[var(--text-muted)]">
          {benefit.description}
        </p>
      )}

      {benefit.code && (
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <code className="tabular rounded-[var(--radius)] border border-dashed border-[var(--border)] px-3 py-2 text-sm tracking-widest text-[var(--text)]">
            {benefit.code}
          </code>
          <button
            type="button"
            onClick={copiar}
            className="text-sm text-[var(--accent)] underline"
          >
            {copiado ? "Copiado" : "Copiar código"}
          </button>
        </div>
      )}

      {benefit.expiresAt && (
        <p className="mt-4 text-xs text-[var(--text-subtle)]">
          Válido até{" "}
          {benefit.expiresAt.toLocaleDateString("pt-PT", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>
      )}
    </div>
  );
}
