import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireActorPage } from "@/server/auth";
import { can } from "@/server/permissions";
import { ComingSoon } from "@/components/ui/page";

export const metadata: Metadata = { title: "Marketing" };

export default async function MarketingPage() {
  const actor = await requireActorPage();
  if (!can(actor, "marketing:read")) redirect("/");

  return (
    <ComingSoon
      title="Marketing"
      phase="Fase 6"
      description="Os envios em massa exigem cuidado com o RGPD: só entram clientes com consentimento explícito registado, e cada envio tem de poder ser justificado. A base já guarda o consentimento e a data — falta a camada de campanhas."
      features={[
        "Campanhas por WhatsApp com modelos aprovados",
        "Segmentos automáticos (em risco, adormecidas, aniversariantes)",
        "Lembretes de manutenção às 3 semanas",
        "Programa de indicações com origem rastreada",
        "Relatório de retorno por campanha",
      ]}
    />
  );
}
