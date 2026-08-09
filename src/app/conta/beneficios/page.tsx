import type { Metadata } from "next";
import Link from "next/link";
import { requireApprovedClientPage } from "@/server/client-auth";
import { getPortalBenefits, getPortalDashboard } from "@/server/client-portal";
import { EmptyState, LoyaltyCard, PortalHeading } from "../portal-ui";
import { BenefitCard } from "./benefit-card";

export const metadata: Metadata = { title: "Benefícios" };
export const dynamic = "force-dynamic";

export default async function BeneficiosPage() {
  const session = await requireApprovedClientPage();

  const [beneficios, dados] = await Promise.all([
    getPortalBenefits(session.clientId, session.unitId),
    getPortalDashboard(session.clientId),
  ]);

  return (
    <div className="space-y-6">
      <PortalHeading
        title="Benefícios"
        subtitle="O seu cartão de fidelidade e o que já ganhou com ele."
      />

      {dados.loyaltyCard && (
        <LoyaltyCard
          stampsCount={dados.loyaltyCard.stampsCount}
          stampsRequired={dados.loyaltyCard.stampsRequired}
          cycleNumber={dados.loyaltyCard.cycleNumber}
        />
      )}

      <section>
        <h2 className="mb-3 text-[0.68rem] tracking-[0.14em] text-[var(--text-muted)] uppercase">
          Disponíveis agora
        </h2>

        {beneficios.length === 0 ? (
          <EmptyState
            title="Ainda sem benefícios"
            description={
              dados.loyaltyCard
                ? "Complete o cartão de carimbos e escolhe a sua recompensa. Os cupões que a equipa lançar também aparecem aqui."
                : "Assim que tiver o primeiro atendimento, começa o seu cartão de fidelidade."
            }
            action={
              <Link
                href="/conta/marcar"
                className="inline-flex h-11 items-center rounded-[var(--radius)] bg-[var(--accent)] px-4 text-sm font-medium text-[var(--accent-fg)] hover:bg-[var(--accent-hover)]"
              >
                Marcar atendimento
              </Link>
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {beneficios.map((b) => (
              <BenefitCard key={`${b.origin}-${b.id}`} benefit={b} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
