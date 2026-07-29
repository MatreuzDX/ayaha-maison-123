import type { AppointmentStatus, ClientStatus } from "@prisma/client";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "success" | "warning" | "danger" | "info" | "accent";

const TONE_CLASS: Record<Tone, string> = {
  neutral: "bg-[var(--neutral-bg)] text-[var(--neutral)]",
  success: "bg-[var(--success-bg)] text-[var(--success)]",
  warning: "bg-[var(--warning-bg)] text-[var(--warning)]",
  danger: "bg-[var(--danger-bg)] text-[var(--danger)]",
  info: "bg-[var(--info-bg)] text-[var(--info)]",
  accent: "bg-[var(--accent)]/15 text-[var(--accent)]",
};

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        TONE_CLASS[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/**
 * Estado da cliente com a cor certa.
 *
 * As cores não são decorativas: "em risco" a amarelo e "adormecida" a
 * vermelho são o que faz alguém pegar no telemóvel. Um estado que passa
 * despercebido não serve de nada.
 */
const CLIENT_STATUS: Record<ClientStatus, { label: string; tone: Tone }> = {
  LEAD: { label: "Contacto", tone: "info" },
  ACTIVE: { label: "Ativa", tone: "success" },
  AT_RISK: { label: "Em risco", tone: "warning" },
  DORMANT: { label: "Adormecida", tone: "danger" },
  BLOCKED: { label: "Bloqueada", tone: "neutral" },
};

export function ClientStatusBadge({ status }: { status: ClientStatus }) {
  const { label, tone } = CLIENT_STATUS[status];
  return <Badge tone={tone}>{label}</Badge>;
}

const APPOINTMENT_STATUS: Record<
  AppointmentStatus,
  { label: string; tone: Tone }
> = {
  REQUESTED: { label: "Pedida", tone: "info" },
  CONFIRMED: { label: "Confirmada", tone: "accent" },
  REMINDED: { label: "Lembrete enviado", tone: "accent" },
  EN_ROUTE: { label: "A caminho", tone: "info" },
  IN_PROGRESS: { label: "Em curso", tone: "info" },
  COMPLETED: { label: "Concluída", tone: "success" },
  NO_SHOW: { label: "Faltou", tone: "danger" },
  CANCELLED: { label: "Cancelada", tone: "neutral" },
};

export function AppointmentStatusBadge({
  status,
}: {
  status: AppointmentStatus;
}) {
  const { label, tone } = APPOINTMENT_STATUS[status];
  return <Badge tone={tone}>{label}</Badge>;
}

export { CLIENT_STATUS, APPOINTMENT_STATUS };
