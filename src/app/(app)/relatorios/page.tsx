import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireActorPage } from "@/server/auth";
import { can } from "@/server/permissions";
import { ComingSoon } from "@/components/ui/page";

export const metadata: Metadata = { title: "Relatórios" };

export default async function RelatoriosPage() {
  const actor = await requireActorPage();
  if (!can(actor, "report:read")) redirect("/");

  return (
    <ComingSoon
      title="Relatórios"
      phase="Fase 7"
      description="Os relatórios usam sempre as mesmas funções que alimentam o painel inicial — nunca contas feitas à parte. É o que garante que o número na página de início e o número no relatório não divergem."
      features={[
        "Receita por período, serviço e profissional",
        "Taxa de retenção e intervalo médio entre visitas",
        "Custo real por atendimento (material e deslocação incluídos)",
        "Rentabilidade por hora de trabalho e por zona",
        "Exportação para folha de cálculo, com registo de auditoria",
      ]}
    />
  );
}
