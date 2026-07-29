import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireActorPage } from "@/server/auth";
import { can } from "@/server/permissions";
import { listAppointments } from "@/server/services/appointment.service";
import { AppointmentStatusBadge } from "@/components/ui/badge";
import {
  EmptyState,
  PageHeader,
  StatCard,
  TableWrap,
  Td,
  Th,
} from "@/components/ui/page";
import { formatEUR, sumCents } from "@/lib/money";
import { fullName } from "@/lib/format";
import { formatDateTime } from "@/lib/datetime";

export const metadata: Metadata = { title: "Atendimentos" };

/** Histórico dos últimos 90 dias — o suficiente para ver padrões sem pesar. */
const DAYS_BACK = 90;

export default async function AtendimentosPage() {
  const actor = await requireActorPage();
  if (!can(actor, "appointment:read")) redirect("/");

  const now = new Date();
  const from = new Date(now.getTime() - DAYS_BACK * 86_400_000);

  const appointments = await listAppointments(actor, { from, to: now });

  const completed = appointments.filter((a) => a.status === "COMPLETED");
  const noShows = appointments.filter((a) => a.status === "NO_SHOW");
  const revenue = sumCents(...completed.map((a) => a.totalCents));

  return (
    <div className="mx-auto max-w-[1400px] space-y-5">
      <PageHeader
        title="Atendimentos"
        subtitle={`Últimos ${DAYS_BACK} dias`}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total" value={String(appointments.length)} />
        <StatCard
          label="Concluídos"
          value={String(completed.length)}
          tone="success"
        />
        <StatCard
          label="Faltas"
          value={String(noShows.length)}
          tone={noShows.length > 0 ? "warning" : "neutral"}
        />
        <StatCard label="Faturado" value={formatEUR(revenue)} />
      </div>

      {appointments.length === 0 ? (
        <EmptyState
          title="Sem atendimentos no período"
          description={`Não há registos nos últimos ${DAYS_BACK} dias. Os atendimentos aparecem aqui à medida que forem marcados e concluídos.`}
          actionLabel={can(actor, "appointment:create") ? "Ver agenda" : undefined}
          actionHref="/agenda"
        />
      ) : (
        <TableWrap>
          <thead>
            <tr>
              <Th>Data</Th>
              <Th>Cliente</Th>
              <Th>Serviços</Th>
              <Th>Profissional</Th>
              <Th>Estado</Th>
              <Th align="right">Total</Th>
            </tr>
          </thead>
          <tbody>
            {appointments
              .slice()
              .reverse()
              .map((appointment) => (
                <tr key={appointment.id} className="hover:bg-[var(--surface)]">
                  <Td>
                    <span className="tabular text-[var(--text-muted)]">
                      {formatDateTime(appointment.startAt)}
                    </span>
                  </Td>
                  <Td>
                    <Link
                      href={`/clientes/${appointment.client.id}`}
                      className="font-medium hover:text-[var(--accent)] hover:underline"
                    >
                      {fullName(
                        appointment.client.firstName,
                        appointment.client.lastName,
                      )}
                    </Link>
                  </Td>
                  <Td>
                    <span className="text-[var(--text-muted)]">
                      {appointment.items.map((i) => i.nameSnapshot).join(", ")}
                    </span>
                  </Td>
                  <Td>
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        className="size-2 rounded-full"
                        style={{
                          backgroundColor: appointment.professional.color,
                        }}
                        aria-hidden="true"
                      />
                      {appointment.professional.displayName}
                    </span>
                  </Td>
                  <Td>
                    <AppointmentStatusBadge status={appointment.status} />
                  </Td>
                  <Td align="right">
                    <span className="tabular">
                      {formatEUR(appointment.totalCents)}
                    </span>
                  </Td>
                </tr>
              ))}
          </tbody>
        </TableWrap>
      )}
    </div>
  );
}
