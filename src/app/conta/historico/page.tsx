import type { Metadata } from "next";
import Link from "next/link";
import { requireApprovedClientPage } from "@/server/client-auth";
import { getPortalAppointments } from "@/server/client-portal";
import { formatEUR } from "@/lib/money";
import { AppointmentRow, Card, EmptyState, PortalHeading } from "../portal-ui";

export const metadata: Metadata = { title: "Histórico" };
export const dynamic = "force-dynamic";

export default async function HistoricoPage() {
  const session = await requireApprovedClientPage();
  const { past } = await getPortalAppointments(session.clientId);

  const concluidos = past.filter((a) => a.status === "COMPLETED");
  const totalGasto = concluidos.reduce((s, a) => s + a.totalCents, 0);

  return (
    <div className="space-y-6">
      <PortalHeading
        title="Histórico"
        subtitle="Todos os atendimentos que já teve connosco."
      />

      {past.length === 0 ? (
        <EmptyState
          title="Ainda sem histórico"
          description="Depois do primeiro atendimento, fica tudo registado aqui."
          action={
            <Link
              href="/conta/marcar"
              className="inline-flex h-11 items-center rounded-[var(--radius)] bg-[var(--accent)] px-4 text-sm font-medium text-[var(--accent-fg)] hover:bg-[var(--accent-hover)]"
            >
              Marcar o primeiro
            </Link>
          }
        />
      ) : (
        <>
          {concluidos.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Card>
                <p className="text-[0.68rem] tracking-[0.14em] text-[var(--text-muted)] uppercase">
                  Atendimentos concluídos
                </p>
                <p className="mt-2 font-[family-name:var(--font-cormorant)] text-3xl text-[var(--text)]">
                  {concluidos.length}
                </p>
              </Card>
              <Card>
                <p className="text-[0.68rem] tracking-[0.14em] text-[var(--text-muted)] uppercase">
                  Total investido
                </p>
                <p className="tabular mt-2 font-[family-name:var(--font-cormorant)] text-3xl text-[var(--text)]">
                  {formatEUR(totalGasto)}
                </p>
              </Card>
            </div>
          )}

          <Card className="py-0">
            <ul>
              {past.map((a) => (
                <AppointmentRow key={a.id} appointment={a} />
              ))}
            </ul>
          </Card>
        </>
      )}
    </div>
  );
}
