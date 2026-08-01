import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireActorPage } from "@/server/auth";
import { can } from "@/server/permissions";
import { ComingSoon } from "@/components/ui/page";

export const metadata: Metadata = { title: "Financeiro" };

export default async function FinanceiroPage() {
  const actor = await requireActorPage();
  if (!can(actor, "finance:read")) redirect("/app");

  return (
    <ComingSoon
      title="Financeiro"
      phase="Fase 4"
      description="A faturação depende de decisões que ainda estão em aberto: o regime de IVA (isenção do art. 53.º ou regime normal), a percentagem de comissão e o software de faturação certificado. Construir antes dessas respostas seria refazer tudo depois."
      features={[
        "Faturas e recibos com numeração sequencial imutável",
        "Registo de pagamentos por método (MB Way, numerário, transferência)",
        "Fecho de caixa diário com conferência",
        "Comissões por profissional, com aprovação da proprietária",
        "Despesas por categoria e margem real por atendimento",
      ]}
    />
  );
}
