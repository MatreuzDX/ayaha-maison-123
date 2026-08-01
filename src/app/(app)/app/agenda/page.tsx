import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { AppointmentStatus } from "@prisma/client";
import { requireActorPage } from "@/server/auth";
import { can } from "@/server/permissions";
import { AppointmentActions } from "./appointment-actions";
import { listAppointments } from "@/server/services/appointment.service";
import { AppointmentStatusBadge } from "@/components/ui/badge";
import { Card, EmptyState, PageHeader } from "@/components/ui/page";
import { formatEUR } from "@/lib/money";
import { fullName, formatPhone } from "@/lib/format";
import {
  formatDayHeading,
  formatTime,
  lisbonEndOfDay,
  lisbonStartOfDay,
} from "@/lib/datetime";

export const metadata: Metadata = { title: "Agenda" };

/** Quantos dias mostrar de uma vez. Uma semana cabe no ecrã sem rolar demais. */
const DAYS_AHEAD = 7;

/**
 * Estados que ainda admitem ação. Uma marcação concluída, cancelada ou com
 * falta já fechou o seu ciclo — mostrar "Concluir" nessas seria oferecer algo
 * que o serviço recusa.
 */
const OPEN_STATUSES: AppointmentStatus[] = [
  "REQUESTED",
  "CONFIRMED",
  "REMINDED",
  "EN_ROUTE",
  "IN_PROGRESS",
];

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const actor = await requireActorPage();
  if (!can(actor, "appointment:read")) redirect("/app");

  const params = await searchParams;

  // A data vem do URL e pode ser inválida — cair para hoje é melhor do que
  // rebentar com "Invalid Date".
  const parsed = params.dia ? new Date(params.dia) : new Date();
  const anchor = Number.isNaN(parsed.getTime()) ? new Date() : parsed;

  const from = lisbonStartOfDay(anchor);
  const to = lisbonEndOfDay(
    new Date(anchor.getTime() + (DAYS_AHEAD - 1) * 86_400_000),
  );

  const appointments = await listAppointments(actor, { from, to });

  const canUpdate = can(actor, "appointment:update");
  const canCancel = can(actor, "appointment:cancel");

  // Agrupar por dia para dar títulos legíveis em vez de uma lista corrida.
  const byDay = new Map<string, typeof appointments>();
  for (const appointment of appointments) {
    const key = lisbonStartOfDay(appointment.startAt).toISOString();
    const list = byDay.get(key) ?? [];
    list.push(appointment);
    byDay.set(key, list);
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-5">
      <PageHeader
        title="Agenda"
        subtitle={`Próximos ${DAYS_AHEAD} dias`}
        action={
          can(actor, "appointment:create") && (
            <Link
              href="/app/agenda/nova"
              className="inline-flex h-11 items-center rounded-[var(--radius)] bg-[var(--accent)] px-4 text-sm font-medium text-[var(--accent-fg)] hover:bg-[var(--accent-hover)]"
            >
              Nova marcação
            </Link>
          )
        }
      />

      {appointments.length === 0 ? (
        <EmptyState
          title="Agenda livre"
          description={`Não há marcações nos próximos ${DAYS_AHEAD} dias. Quando marcar um atendimento, ele aparece aqui com a hora de partida já calculada.`}
          actionLabel={
            can(actor, "appointment:create") ? "Nova marcação" : undefined
          }
          actionHref="/app/agenda/nova"
        />
      ) : (
        <div className="space-y-5">
          {[...byDay.entries()].map(([day, items]) => (
            <section key={day}>
              <h2 className="mb-2 text-lg">
                {formatDayHeading(new Date(day))}
              </h2>

              <div className="space-y-2">
                {items.map((appointment) => (
                  <Card
                    key={appointment.id}
                    className="flex flex-wrap items-center gap-3"
                  >
                    <div
                      className="w-1 self-stretch rounded-full"
                      style={{ backgroundColor: appointment.professional.color }}
                      aria-hidden="true"
                    />

                    <div className="tabular w-20 shrink-0">
                      <p className="font-medium">
                        {formatTime(appointment.startAt)}
                      </p>
                      <p className="text-xs text-[var(--text-muted)]">
                        {formatTime(appointment.endAt)}
                      </p>
                    </div>

                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/app/clientes/${appointment.client.id}`}
                        className="font-medium hover:text-[var(--accent)] hover:underline"
                      >
                        {fullName(
                          appointment.client.firstName,
                          appointment.client.lastName,
                        )}
                      </Link>
                      <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                        {appointment.items
                          .map((i) => i.nameSnapshot)
                          .join(", ")}
                        {" · "}
                        {appointment.professional.displayName}
                      </p>
                      <p className="tabular mt-0.5 text-xs text-[var(--text-muted)]">
                        {formatPhone(appointment.client.phone)}
                        {appointment.client.city && ` · ${appointment.client.city}`}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <AppointmentStatusBadge status={appointment.status} />
                      <span className="tabular text-sm">
                        {formatEUR(appointment.totalCents)}
                      </span>
                      {OPEN_STATUSES.includes(appointment.status) && (
                        <AppointmentActions
                          appointmentId={appointment.id}
                          clientName={fullName(
                            appointment.client.firstName,
                            appointment.client.lastName,
                          )}
                          totalCents={appointment.totalCents}
                          when={`${formatDayHeading(appointment.startAt)}, ${formatTime(appointment.startAt)}`}
                          canComplete={canUpdate}
                          canCancel={canCancel}
                        />
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
