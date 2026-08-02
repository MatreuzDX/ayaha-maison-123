import type { Metadata } from "next";
import type { AppointmentStatus } from "@prisma/client";
import { requireClientPage } from "@/server/client-auth";
import { getClientPortalData } from "@/server/client-portal";
import { AppointmentStatusBadge } from "@/components/ui/badge";
import { formatEUR } from "@/lib/money";
import { formatDayHeading, formatTime } from "@/lib/datetime";
import { whatsappLink } from "@/lib/format";
import { SITE, WA_MESSAGES } from "@/lib/site-config";

export const metadata: Metadata = { title: "A minha conta" };

const OPEN_STATUSES = new Set<AppointmentStatus>([
  "REQUESTED",
  "CONFIRMED",
  "REMINDED",
  "EN_ROUTE",
  "IN_PROGRESS",
]);

export default async function ContaPage() {
  const session = await requireClientPage();

  if (!session.approved) {
    return (
      <div className="space-y-4">
        <h1 className="font-[family-name:var(--font-cormorant)] text-3xl text-[var(--text)]">
          Olá, {session.name}
        </h1>
        <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-2)] p-6">
          <p className="text-[var(--text)]">
            A sua conta está a aguardar aprovação da equipa AYAHA MAISON.
          </p>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            É só desta vez — assim que a equipa confirmar, passa a ver aqui as
            suas marcações e o cartão AYAHA Club. Costuma ser rápido.
          </p>
        </div>
      </div>
    );
  }

  const { appointments, loyaltyCard } = await getClientPortalData(
    session.clientId,
  );
  const upcoming = appointments.filter((a) => OPEN_STATUSES.has(a.status));
  const past = appointments.filter((a) => !OPEN_STATUSES.has(a.status));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-[family-name:var(--font-cormorant)] text-3xl text-[var(--text)]">
          Olá, {session.name}
        </h1>
        <a
          href={whatsappLink(SITE.whatsapp, WA_MESSAGES.agendar)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-11 items-center rounded-[var(--radius)] bg-[var(--accent)] px-4 text-sm font-medium text-[var(--accent-fg)] hover:bg-[var(--accent-hover)]"
        >
          Marcar atendimento
        </a>
      </div>

      {loyaltyCard && (
        <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-2)] p-6">
          <h2 className="text-lg text-[var(--text)]">AYAHA Club</h2>
          <p className="mt-0.5 text-sm text-[var(--text-muted)]">
            Cartão {loyaltyCard.cycleNumber} · {loyaltyCard.stampsCount} de{" "}
            {loyaltyCard.stampsRequired} carimbos
          </p>
          <div
            className="mt-3 flex gap-2"
            role="img"
            aria-label={`${loyaltyCard.stampsCount} de ${loyaltyCard.stampsRequired} carimbos`}
          >
            {Array.from({ length: loyaltyCard.stampsRequired }, (_, i) => (
              <div
                key={i}
                className={
                  i < loyaltyCard.stampsCount
                    ? "size-9 rounded-full border-2 border-[var(--accent)] bg-[var(--accent)]"
                    : "size-9 rounded-full border-2 border-dashed border-[var(--border)]"
                }
              />
            ))}
          </div>
          {loyaltyCard.stampsCount >= loyaltyCard.stampsRequired - 1 &&
            loyaltyCard.stampsCount < loyaltyCard.stampsRequired && (
              <p className="mt-3 text-sm text-[var(--accent)]">
                Falta um carimbo para a recompensa.
              </p>
            )}
        </div>
      )}

      <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-2)] p-6">
        <h2 className="text-lg text-[var(--text)]">Próximas marcações</h2>
        {upcoming.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--text-muted)]">
            Ainda não tem marcações agendadas.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-[var(--border)]">
            {upcoming.map((a) => (
              <li
                key={a.id}
                className="flex flex-wrap items-center justify-between gap-2 py-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[var(--text)]">
                    {a.services.join(", ") || "Sem serviços"}
                  </p>
                  <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                    {formatDayHeading(a.startAt)}, {formatTime(a.startAt)} ·{" "}
                    {a.professionalName}
                  </p>
                </div>
                <AppointmentStatusBadge status={a.status} />
              </li>
            ))}
          </ul>
        )}
      </div>

      {past.length > 0 && (
        <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-2)] p-6">
          <h2 className="text-lg text-[var(--text)]">Histórico</h2>
          <ul className="mt-3 divide-y divide-[var(--border)]">
            {past.map((a) => (
              <li
                key={a.id}
                className="flex flex-wrap items-center justify-between gap-2 py-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[var(--text)]">
                    {a.services.join(", ") || "Sem serviços"}
                  </p>
                  <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                    {formatDayHeading(a.startAt)}, {formatTime(a.startAt)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <AppointmentStatusBadge status={a.status} />
                  <span className="tabular text-sm text-[var(--text)]">
                    {formatEUR(a.totalCents)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
