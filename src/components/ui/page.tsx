import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl">{title}</h1>
        {subtitle && (
          <p className="mt-0.5 text-sm text-[var(--text-muted)]">{subtitle}</p>
        )}
      </div>
      {action}
    </div>
  );
}

export function Card({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-2)] p-4",
        className,
      )}
    >
      {children}
    </div>
  );
}

/**
 * Estado vazio.
 *
 * Nunca deixar uma lista vazia sem explicação: uma tabela em branco parece
 * uma avaria. Diz o que aconteceu e oferece a ação seguinte.
 */
export function EmptyState({
  title,
  description,
  actionLabel,
  actionHref,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
}) {
  return (
    <div className="rounded-[var(--radius)] border border-dashed border-[var(--border)] bg-[var(--surface)] px-6 py-12 text-center">
      <p className="font-[family-name:var(--font-cormorant)] text-lg">
        {title}
      </p>
      <p className="mx-auto mt-2 max-w-md text-sm text-[var(--text-muted)]">
        {description}
      </p>
      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className="mt-4 inline-flex h-10 items-center rounded-[var(--radius)] bg-[var(--accent)] px-4 text-sm font-medium text-[var(--accent-fg)] hover:bg-[var(--accent-hover)]"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  );
}

/** Cartão de indicador. Usa `tabular` para os números alinharem em coluna. */
export function StatCard({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "neutral" | "success" | "warning" | "danger";
}) {
  const toneClass = {
    neutral: "text-[var(--text)]",
    success: "text-[var(--success)]",
    warning: "text-[var(--warning)]",
    danger: "text-[var(--danger)]",
  }[tone];

  return (
    <Card>
      <p className="text-xs tracking-wide text-[var(--text-muted)] uppercase">
        {label}
      </p>
      <p className={cn("tabular mt-1.5 text-2xl font-medium", toneClass)}>
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-[var(--text-muted)]">{hint}</p>}
    </Card>
  );
}

/**
 * Aviso de secção ainda por construir.
 *
 * Preferível a uma página em branco ou a um 404: diz em que fase entra e o que
 * vai fazer, para quem estiver a experimentar o sistema perceber o plano.
 */
export function ComingSoon({
  title,
  phase,
  description,
  features,
}: {
  title: string;
  phase: string;
  description: string;
  features: string[];
}) {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title={title} subtitle={phase} />

      <div className="rounded-[var(--radius)] border border-dashed border-[var(--border)] bg-[var(--surface)] p-6">
        <p className="text-sm text-[var(--text-muted)]">{description}</p>

        <p className="mt-5 mb-2 text-xs tracking-wide text-[var(--text-muted)] uppercase">
          O que vai incluir
        </p>
        <ul className="space-y-1.5">
          {features.map((feature) => (
            <li
              key={feature}
              className="flex items-start gap-2 text-sm text-[var(--text)]"
            >
              <span
                className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[var(--accent)]"
                aria-hidden="true"
              />
              {feature}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/** Tabela responsiva. O `overflow-x-auto` evita que a página role na horizontal. */
export function TableWrap({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-[var(--radius)] border border-[var(--border)]">
      <table className="w-full min-w-[640px] text-sm">{children}</table>
    </div>
  );
}

export function Th({
  children,
  align = "left",
}: {
  children: ReactNode;
  align?: "left" | "right" | "center";
}) {
  return (
    <th
      scope="col"
      className={cn(
        "border-b border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-xs font-medium tracking-wide text-[var(--text-muted)] uppercase",
        align === "right" && "text-right",
        align === "center" && "text-center",
        align === "left" && "text-left",
      )}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  align = "left",
  className,
}: {
  children: ReactNode;
  align?: "left" | "right" | "center";
  className?: string;
}) {
  return (
    <td
      className={cn(
        "border-b border-[var(--border)] px-3 py-2.5",
        align === "right" && "text-right",
        align === "center" && "text-center",
        className,
      )}
    >
      {children}
    </td>
  );
}
