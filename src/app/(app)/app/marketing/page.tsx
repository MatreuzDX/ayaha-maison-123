import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireActorPage } from "@/server/auth";
import { can } from "@/server/permissions";
import { PageHeader } from "@/components/ui/page";
import { listSegments } from "@/server/services/marketing.service";
import { SegmentList } from "./segment-list";

export const metadata: Metadata = { title: "Marketing" };

export default async function MarketingPage() {
  const actor = await requireActorPage();
  if (!can(actor, "marketing:read")) redirect("/app");

  const segments = await listSegments(actor);
  const totalContactaveis = segments.reduce(
    (soma, s) => soma + s.clients.length,
    0,
  );

  return (
    <div className="mx-auto max-w-[1100px] space-y-6">
      <PageHeader
        title="Marketing"
        subtitle={
          totalContactaveis === 0
            ? "Nenhuma cliente à espera de contacto neste momento."
            : `${totalContactaveis} ${totalContactaveis === 1 ? "cliente" : "clientes"} que vale a pena contactar hoje.`
        }
      />

      {/* O enquadramento importa: sem ele, alguém vai à procura do botão de
          "enviar a todas" e conclui que falta funcionalidade, quando na
          verdade é uma decisão tomada — ver marketing.service.ts. */}
      <p className="max-w-2xl text-sm text-[var(--text-muted)]">
        Cada lista é uma sugestão de quem contactar, com a mensagem já
        escrita — revê-se, ajusta-se, e envia-se uma a uma. Não há envio em
        massa: isso exigiria a API de empresa da Meta, com modelos aprovados
        e custo por conversa. E uma mensagem escrita por si à sua cliente
        tem muito mais resposta do que um envio igual para todas.
      </p>

      {segments.map((s) => (
        <SegmentList key={s.key} segment={s} />
      ))}
    </div>
  );
}
