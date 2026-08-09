import type { Metadata } from "next";
import Link from "next/link";
import { requireApprovedClientPage } from "@/server/client-auth";
import { getPortalAppointments } from "@/server/client-portal";
import { AppointmentRow, Card, EmptyState, PortalHeading } from "../portal-ui";

export const metadata: Metadata = { title: "Marcações" };
export const dynamic = "force-dynamic";

export default async function MarcacoesPage() {
  const session = await requireApprovedClientPage();
  const { upcoming, past } = await getPortalAppointments(session.clientId);

  return (
    <div className="space-y-6">
      <PortalHeading
        title="Marcações"
        subtitle="Tudo o que já marcou, num só sítio."
        action={
          <Link
            href="/conta/marcar"
            className="inline-flex h-11 items-center rounded-[var(--radius)] bg-[var(--accent)] px-4 text-sm font-medium text-[var(--accent-fg)] hover:bg-[var(--accent-hover)]"
          >
            Marcar atendimento
          </Link>
        }
      />

      <section>
        <h2 className="mb-3 text-[0.68rem] tracking-[0.14em] text-[var(--text-muted)] uppercase">
          Próximas
        </h2>
        {upcoming.length === 0 ? (
          <EmptyState
            title="Nada agendado"
            description="Quando marcar um atendimento, aparece aqui até acontecer."
          />
        ) : (
          <Card className="py-0">
            <ul>
              {upcoming.map((a) => (
                <AppointmentRow key={a.id} appointment={a} />
              ))}
            </ul>
          </Card>
        )}
      </section>

      {past.length > 0 && (
        <section>
          <h2 className="mb-3 text-[0.68rem] tracking-[0.14em] text-[var(--text-muted)] uppercase">
            Anteriores
          </h2>
          <Card className="py-0">
            <ul>
              {past.slice(0, 5).map((a) => (
                <AppointmentRow key={a.id} appointment={a} />
              ))}
            </ul>
          </Card>
          {past.length > 5 && (
            <Link
              href="/conta/historico"
              className="mt-3 inline-block text-sm text-[var(--accent)] underline"
            >
              Ver histórico completo ({past.length})
            </Link>
          )}
        </section>
      )}
    </div>
  );
}
