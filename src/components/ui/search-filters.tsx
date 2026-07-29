"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Pesquisa e filtros ligados ao URL.
 *
 * O estado vive na query string, não em `useState`: assim uma pesquisa pode
 * ser guardada nos favoritos, partilhada com uma colega e sobrevive ao
 * recarregar a página. É também o que permite ao servidor filtrar os dados —
 * um filtro só no cliente obrigaria a trazer a base inteira para o browser.
 */

const DEBOUNCE_MS = 300;

export function SearchInput({
  placeholder = "Pesquisar…",
  paramName = "q",
}: {
  placeholder?: string;
  paramName?: string;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [value, setValue] = useState(params.get(paramName) ?? "");

  // Espera que a pessoa pare de escrever antes de ir ao servidor. Sem isto,
  // "Marta" dispararia cinco queries.
  useEffect(() => {
    const current = params.get(paramName) ?? "";
    if (value === current) return;

    const timer = setTimeout(() => {
      const next = new URLSearchParams(params.toString());
      if (value) next.set(paramName, value);
      else next.delete(paramName);
      next.delete("page");
      startTransition(() => router.replace(`?${next.toString()}`));
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [value, params, paramName, router]);

  return (
    <div className="relative flex-1 sm:max-w-xs">
      <Search
        size={16}
        className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[var(--text-subtle)]"
        aria-hidden="true"
      />
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        aria-busy={isPending}
        className="h-11 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-2)] pr-9 pl-9 text-sm text-[var(--text)] placeholder:text-[var(--text-subtle)] focus:border-[var(--accent)] focus:outline-none"
      />
      {value && (
        <button
          type="button"
          onClick={() => setValue("")}
          aria-label="Limpar pesquisa"
          className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-[var(--text-subtle)] hover:text-[var(--text)]"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}

export interface FilterOption {
  value: string;
  label: string;
}

export function FilterSelect({
  paramName,
  options,
  allLabel,
  label,
}: {
  paramName: string;
  options: FilterOption[];
  allLabel: string;
  label: string;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const current = params.get(paramName) ?? "";

  function onChange(value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(paramName, value);
    else next.delete(paramName);
    next.delete("page");
    router.replace(`?${next.toString()}`);
  }

  return (
    <select
      value={current}
      onChange={(e) => onChange(e.target.value)}
      aria-label={label}
      className="h-11 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-2)] px-3 text-sm text-[var(--text)] focus:border-[var(--accent)] focus:outline-none"
    >
      <option value="">{allLabel}</option>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

export function Pagination({
  page,
  totalPages,
  total,
}: {
  page: number;
  totalPages: number;
  total: number;
}) {
  const router = useRouter();
  const params = useSearchParams();

  if (totalPages <= 1) {
    return (
      <p className="text-sm text-[var(--text-muted)]">
        {total} {total === 1 ? "registo" : "registos"}
      </p>
    );
  }

  function goTo(target: number) {
    const next = new URLSearchParams(params.toString());
    next.set("page", String(target));
    router.replace(`?${next.toString()}`);
  }

  return (
    <div className="flex items-center justify-between gap-3">
      <p className="text-sm text-[var(--text-muted)]">
        Página {page} de {totalPages} · {total} registos
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => goTo(page - 1)}
          disabled={page <= 1}
          className={cn(
            "h-9 rounded-[var(--radius)] border border-[var(--border)] px-3 text-sm",
            page <= 1
              ? "cursor-not-allowed opacity-40"
              : "hover:bg-[var(--surface)]",
          )}
        >
          Anterior
        </button>
        <button
          type="button"
          onClick={() => goTo(page + 1)}
          disabled={page >= totalPages}
          className={cn(
            "h-9 rounded-[var(--radius)] border border-[var(--border)] px-3 text-sm",
            page >= totalPages
              ? "cursor-not-allowed opacity-40"
              : "hover:bg-[var(--surface)]",
          )}
        >
          Seguinte
        </button>
      </div>
    </div>
  );
}
