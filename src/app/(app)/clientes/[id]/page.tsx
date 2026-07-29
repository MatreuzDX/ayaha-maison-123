import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MessageCircle, Phone, MapPin, Mail } from "lucide-react";
import { requireActorPage } from "@/server/auth";
import { can } from "@/server/permissions";
import { getClient } from "@/server/services/client.service";
import { NotFoundError } from "@/server/errors";
import { Button } from "@/components/ui/button";
import {
  AppointmentStatusBadge,
  Badge,
  ClientStatusBadge,
} from "@/components/ui/badge";
import { Card, PageHeader, StatCard } from "@/components/ui/page";
import { formatEUR } from "@/lib/money";
import {
  formatAddress,
  formatPhone,
  fullName,
  mapsLink,
  whatsappLink,
} from "@/lib/format";
import { formatDateTime, formatRelativeDays } from "@/lib/datetime";

export const metadata: Metadata = { title: "Ficha de cliente" };

export default async function ClienteDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await requireActorPage();
  const { id } = await params;

  let client;
  try {
    client = await getClient(actor, id);
  } catch (err) {
    if (err instanceof NotFoundError) notFound();
    throw err;
  }

  const name = fullName(client.firstName, client.lastName);
  const address = formatAddress({
    addressLine: client.addressLine,
    addressExtra: client.addressExtra,
    postalCode: client.postalCode,
    city: client.city,
  });

  const activeCard = client.loyaltyCards[0];

  return (
    <div className="mx-auto max-w-[1400px] space-y-5">
      <PageHeader
        title={name}
        subtitle={
          client.lastVisitAt
            ? `Última visita ${formatRelativeDays(client.lastVisitAt)}`
            : "Ainda não veio"
        }
        action={
          <div className="flex flex-wrap gap-2">
            {can(actor, "client:update") && (
              <Link href={`/clientes/${client.id}/editar`}>
                <Button variant="secondary">Editar</Button>
              </Link>
            )}
            {can(actor, "appointment:create") && (
              <Link href={`/agenda/nova?cliente=${client.id}`}>
                <Button>Marcar atendimento</Button>
              </Link>
            )}
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <ClientStatusBadge status={client.status} />
        {client.travelZone && (
          <Badge tone="accent">
            {client.travelZone.name} · {formatEUR(client.travelZone.feeCents)}
          </Badge>
        )}
        {client.ownerProfessional && (
          <Badge>Responsável: {client.ownerProfessional.displayName}</Badge>
        )}
        {!client.marketingOptIn && (
          <Badge tone="neutral">Sem consentimento de marketing</Badge>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Visitas" value={String(client.visitCount)} />
        <StatCard
          label="Total gasto"
          value={formatEUR(client.lifetimeValueCents)}
        />
        <StatCard
          label="Ticket médio"
          value={formatEUR(client.avgTicketCents)}
        />
        <StatCard
          label="Faltas"
          value={String(client.noShowCount)}
          tone={client.noShowCount > 0 ? "warning" : "neutral"}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-1">
          <Card className="space-y-3">
            <h2 className="text-lg">Contacto</h2>

            <a
              href={`tel:${client.phone}`}
              className="flex items-center gap-2.5 text-sm hover:text-[var(--accent)]"
            >
              <Phone size={16} className="text-[var(--text-subtle)]" />
              <span className="tabular">{formatPhone(client.phone)}</span>
            </a>

            {client.phoneWhatsapp && (
              <a
                href={whatsappLink(client.phone)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 text-sm hover:text-[var(--accent)]"
              >
                <MessageCircle size={16} className="text-[var(--text-subtle)]" />
                Abrir no WhatsApp
              </a>
            )}

            {client.email && (
              <a
                href={`mailto:${client.email}`}
                className="flex items-center gap-2.5 text-sm break-all hover:text-[var(--accent)]"
              >
                <Mail size={16} className="shrink-0 text-[var(--text-subtle)]" />
                {client.email}
              </a>
            )}

            {address && (
              <a
                href={mapsLink(address)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-2.5 text-sm hover:text-[var(--accent)]"
              >
                <MapPin
                  size={16}
                  className="mt-0.5 shrink-0 text-[var(--text-subtle)]"
                />
                {address}
              </a>
            )}

            {(client.accessNotes || client.parkingNotes) && (
              <div className="space-y-1 border-t border-[var(--border)] pt-3 text-sm text-[var(--text-muted)]">
                {client.accessNotes && <p>Acesso: {client.accessNotes}</p>}
                {client.parkingNotes && (
                  <p>Estacionamento: {client.parkingNotes}</p>
                )}
              </div>
            )}
          </Card>

          {activeCard && (
            <Card>
              <h2 className="text-lg">AYAHA Club</h2>
              <p className="mt-0.5 text-sm text-[var(--text-muted)]">
                Cartão {activeCard.cycleNumber} ·{" "}
                {activeCard.stampsCount} de {activeCard.stampsRequired} carimbos
              </p>

              <div
                className="mt-3 flex gap-2"
                role="img"
                aria-label={`${activeCard.stampsCount} de ${activeCard.stampsRequired} carimbos`}
              >
                {Array.from({ length: activeCard.stampsRequired }, (_, i) => (
                  <div
                    key={i}
                    className={
                      i < activeCard.stampsCount
                        ? "size-9 rounded-full border-2 border-[var(--accent)] bg-[var(--accent)]"
                        : "size-9 rounded-full border-2 border-dashed border-[var(--border)]"
                    }
                  />
                ))}
              </div>

              {activeCard.stampsCount >= activeCard.stampsRequired - 1 &&
                activeCard.stampsCount < activeCard.stampsRequired && (
                  <p className="mt-3 text-sm text-[var(--accent)]">
                    Falta um carimbo para a recompensa.
                  </p>
                )}
            </Card>
          )}

          {client.notes && (
            <Card>
              <h2 className="text-lg">Notas</h2>
              <p className="mt-2 text-sm whitespace-pre-wrap text-[var(--text-muted)]">
                {client.notes}
              </p>
            </Card>
          )}
        </div>

        <div className="lg:col-span-2">
          <Card>
            <h2 className="text-lg">Histórico de atendimentos</h2>

            {client.appointments.length === 0 ? (
              <p className="mt-3 text-sm text-[var(--text-muted)]">
                Ainda não há atendimentos registados.
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-[var(--border)]">
                {client.appointments.map((appointment) => (
                  <li
                    key={appointment.id}
                    className="flex flex-wrap items-center justify-between gap-2 py-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium">
                        {appointment.items
                          .map((i) => i.nameSnapshot)
                          .join(", ") || "Sem serviços"}
                      </p>
                      <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                        {formatDateTime(appointment.startAt)} ·{" "}
                        {appointment.professional.displayName}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <AppointmentStatusBadge status={appointment.status} />
                      <span className="tabular text-sm">
                        {formatEUR(appointment.totalCents)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
