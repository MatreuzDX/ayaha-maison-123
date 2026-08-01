import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireActorPage } from "@/server/auth";
import { can } from "@/server/permissions";
import { listClients } from "@/server/services/client.service";
import { listServices } from "@/server/services/service.service";
import { listProfessionals } from "@/server/services/professional.service";
import { EmptyState, PageHeader } from "@/components/ui/page";
import { fullName } from "@/lib/format";
import { AppointmentForm } from "./appointment-form";

export const metadata: Metadata = { title: "Nova marcação" };

export default async function NovaMarcacaoPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const actor = await requireActorPage();
  if (!can(actor, "appointment:create")) redirect("/app/agenda");

  const params = await searchParams;

  const [clientsResult, services, team] = await Promise.all([
    listClients(actor, { perPage: 100 }),
    listServices(actor),
    listProfessionals(actor),
  ]);

  const bookable = team.filter((p) => p.isBookable);

  if (clientsResult.items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl space-y-5">
        <PageHeader title="Nova marcação" />
        <EmptyState
          title="Ainda não há clientes"
          description="É preciso ter pelo menos uma ficha de cliente antes de marcar um atendimento."
          actionLabel="Criar primeira cliente"
          actionHref="/app/clientes/nova"
        />
      </div>
    );
  }

  if (services.length === 0 || bookable.length === 0) {
    return (
      <div className="mx-auto max-w-3xl space-y-5">
        <PageHeader title="Nova marcação" />
        <EmptyState
          title={
            services.length === 0
              ? "Sem serviços no catálogo"
              : "Sem profissionais disponíveis"
          }
          description={
            services.length === 0
              ? "Adicione serviços ao catálogo antes de marcar atendimentos."
              : "Nenhuma profissional está marcada como disponível para marcações."
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader
        title="Nova marcação"
        subtitle="A hora de partida e a taxa de deslocação são calculadas a partir da zona da cliente."
      />

      <AppointmentForm
        defaultClientId={params.cliente}
        clients={clientsResult.items.map((c) => ({
          id: c.id,
          name: fullName(c.firstName, c.lastName),
          zoneName: c.travelZone?.name ?? null,
          zoneFeeCents: c.travelZone?.feeCents ?? 0,
          zoneFreeAboveCents: null,
        }))}
        services={services.map((s) => ({
          id: s.id,
          name: s.name,
          durationMin: s.durationMin,
          priceCents: s.priceCents,
        }))}
        professionals={bookable.map((p) => ({
          id: p.id,
          displayName: p.displayName,
          color: p.color,
        }))}
      />
    </div>
  );
}
