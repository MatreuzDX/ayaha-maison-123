import type { ReactNode } from "react";
import type { AppointmentStatus } from "@prisma/client";
import { AppointmentStatusBadge } from "@/components/ui/badge";
import { formatEUR } from "@/lib/money";
import { formatDayHeading, formatTime } from "@/lib/datetime";
import type { PortalAppointment } from "@/server/client-portal";

/** Peças partilhadas pelas páginas do portal, para manterem o mesmo ar. */

export function PortalHeading({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="font-[family-name:var(--font-cormorant)] text-3xl text-[var(--text)]">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 text-sm text-[var(--text-muted)]">{subtitle}</p>
        )}
      </div>
      {action}
    </div>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-2)] p-6 ${className}`}
    >
      {children}
    </div>
  );
}

export function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-2)] p-5">
      <p className="text-[0.68rem] tracking-[0.14em] text-[var(--text-muted)] uppercase">
        {label}
      </p>
      <p className="mt-2 font-[family-name:var(--font-cormorant)] text-3xl text-[var(--text)]">
        {value}
      </p>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <Card className="text-center">
      <p className="font-[family-name:var(--font-cormorant)] text-xl text-[var(--text)]">
        {title}
      </p>
      <p className="mx-auto mt-2 max-w-sm text-sm text-[var(--text-muted)]">
        {description}
      </p>
      {action && <div className="mt-5">{action}</div>}
    </Card>
  );
}

/**
 * Cartão de fidelidade — carimbos, não pontos.
 *
 * O programa da AYAHA é um cartão de carimbos; mostrar "pontos" seria
 * inventar uma moeda que o sistema não tem, e a cliente ficaria à espera
 * de um saldo que nunca lhe aparece no atendimento.
 */
export function LoyaltyCard({
  stampsCount,
  stampsRequired,
  cycleNumber,
}: {
  stampsCount: number;
  stampsRequired: number;
  cycleNumber: number;
}) {
  const faltam = Math.max(0, stampsRequired - stampsCount);
  const pct = Math.min(100, Math.round((stampsCount / stampsRequired) * 100));

  return (
    <Card>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-[family-name:var(--font-cormorant)] text-xl text-[var(--text)]">
          AYAHA Club
        </h2>
        <span className="text-xs text-[var(--text-muted)]">
          Cartão {cycleNumber}
        </span>
      </div>

      <div
        className="mt-5 flex flex-wrap gap-2.5"
        role="img"
        aria-label={`${stampsCount} de ${stampsRequired} carimbos`}
      >
        {Array.from({ length: stampsRequired }, (_, i) => (
          <div
            key={i}
            className={
              i < stampsCount
                ? "size-10 rounded-full border border-[var(--accent)] bg-[var(--accent)]"
                : "size-10 rounded-full border border-dashed border-[var(--border)]"
            }
          />
        ))}
      </div>

      <div className="mt-5">
        <div className="h-1 w-full overflow-hidden rounded-full bg-[var(--border)]">
          <div
            className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="mt-3 text-sm text-[var(--text-muted)]">
          {faltam === 0
            ? "Cartão completo — fale connosco para escolher a sua recompensa."
            : faltam === 1
              ? "Falta 1 atendimento para a sua recompensa."
              : `Faltam ${faltam} atendimentos para a sua recompensa.`}
        </p>
      </div>
    </Card>
  );
}

/** Uma marcação, como a cliente a vê. */
export function AppointmentRow({
  appointment,
  showPrice = true,
}: {
  appointment: PortalAppointment;
  showPrice?: boolean;
}) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] py-4 last:border-b-0">
      <div className="min-w-0">
        <p className="text-sm font-medium text-[var(--text)]">
          {appointment.services.join(", ") || "Sem serviços"}
        </p>
        <p className="mt-0.5 text-xs text-[var(--text-muted)]">
          {formatDayHeading(appointment.startAt)},{" "}
          {formatTime(appointment.startAt)}
          {appointment.professionalName && ` · ${appointment.professionalName}`}
        </p>
        {appointment.clientNotes && (
          <p className="mt-1 text-xs text-[var(--text-subtle)] italic">
            “{appointment.clientNotes}”
          </p>
        )}
      </div>
      <div className="flex items-center gap-3">
        <StatusBadge status={appointment.status} />
        {showPrice && (
          <span className="tabular text-sm text-[var(--text)]">
            {formatEUR(appointment.totalCents)}
          </span>
        )}
      </div>
    </li>
  );
}

/** Reutiliza o badge da equipa — os estados são exatamente os mesmos. */
export function StatusBadge({ status }: { status: AppointmentStatus }) {
  return <AppointmentStatusBadge status={status} />;
}
