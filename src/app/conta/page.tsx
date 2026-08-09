import type { Metadata } from "next";
import Link from "next/link";
import { requireClientPage } from "@/server/client-auth";
import { getPortalDashboard } from "@/server/client-portal";
import { formatEUR } from "@/lib/money";
import { formatDayHeading, formatTime } from "@/lib/datetime";
import {
  Card,
  EmptyState,
  LoyaltyCard,
  PortalHeading,
  Stat,
  StatusBadge,
} from "./portal-ui";

export const metadata: Metadata = { title: "Início" };
export const dynamic = "force-dynamic";

export default async function ContaPage() {
  const session = await requireClientPage();

  // Conta ainda por aprovar: esta é a única página do portal que ela vê.
  if (!session.approved) {
    return (
      <div className="space-y-4">
        <PortalHeading title={`Olá, ${session.name}`} />
        <Card>
          <p className="text-[var(--text)]">
            A sua conta está a aguardar aprovação da equipa AYAHA MAISON.
          </p>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            É só desta vez — assim que a equipa confirmar, passa a ver aqui as
            suas marcações, o cartão AYAHA Club e os seus benefícios.
          </p>
        </Card>
      </div>
    );
  }

  const dados = await getPortalDashboard(session.clientId);

  return (
    <div className="space-y-6">
      <PortalHeading
        title={`Olá, ${session.name}`}
        subtitle="Bem-vinda ao seu espaço na AYAHA MAISON."
        action={
          <Link
            href="/conta/marcar"
            className="inline-flex h-11 items-center rounded-[var(--radius)] bg-[var(--accent)] px-4 text-sm font-medium text-[var(--accent-fg)] hover:bg-[var(--accent-hover)]"
          >
            Marcar atendimento
          </Link>
        }
      />

      {/* Próxima marcação — o que a cliente quer saber primeiro. */}
      {dados.nextAppointment ? (
        <Card>
          <p className="text-[0.68rem] tracking-[0.14em] text-[var(--text-muted)] uppercase">
            Próxima marcação
          </p>
          <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="font-[family-name:var(--font-cormorant)] text-2xl text-[var(--text)]">
                {dados.nextAppointment.services.join(", ")}
              </p>
              <p className="mt-1 text-sm text-[var(--text-muted)]">
                {formatDayHeading(dados.nextAppointment.startAt)}, às{" "}
                {formatTime(dados.nextAppointment.startAt)}
              </p>
              <p className="mt-0.5 text-sm text-[var(--text-muted)]">
                Com {dados.nextAppointment.professionalName}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <StatusBadge status={dados.nextAppointment.status} />
              <span className="tabular text-sm text-[var(--text)]">
                {formatEUR(dados.nextAppointment.totalCents)}
              </span>
            </div>
          </div>
          <Link
            href="/conta/marcacoes"
            className="mt-4 inline-block text-sm text-[var(--accent)] underline"
          >
            Ver marcação
          </Link>
        </Card>
      ) : (
        <EmptyState
          title="Nenhuma marcação agendada"
          description="Quando marcar o próximo atendimento, aparece aqui."
          action={
            <Link
              href="/conta/marcar"
              className="inline-flex h-11 items-center rounded-[var(--radius)] bg-[var(--accent)] px-4 text-sm font-medium text-[var(--accent-fg)] hover:bg-[var(--accent-hover)]"
            >
              Marcar atendimento
            </Link>
          }
        />
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Atendimentos" value={String(dados.totalAppointments)} />
        <Stat label="Concluídos" value={String(dados.completedCount)} />
        <Stat label="Benefícios" value={String(dados.availableBenefits)} />
      </div>

      {dados.loyaltyCard && (
        <LoyaltyCard
          stampsCount={dados.loyaltyCard.stampsCount}
          stampsRequired={dados.loyaltyCard.stampsRequired}
          cycleNumber={dados.loyaltyCard.cycleNumber}
        />
      )}
    </div>
  );
}
