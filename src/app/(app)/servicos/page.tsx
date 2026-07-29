import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireActorPage } from "@/server/auth";
import { can } from "@/server/permissions";
import {
  listCategories,
  listServices,
} from "@/server/services/service.service";
import {
  DeactivateServiceButton,
  EditServiceButton,
  NewServiceButton,
} from "./service-actions";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  EmptyState,
  PageHeader,
  StatCard,
  TableWrap,
  Td,
  Th,
} from "@/components/ui/page";
import { formatEUR } from "@/lib/money";
import { formatDuration } from "@/lib/datetime";

export const metadata: Metadata = { title: "Serviços" };

export default async function ServicosPage() {
  const actor = await requireActorPage();
  if (!can(actor, "service:read")) redirect("/");

  const canWrite = can(actor, "service:write");

  const [services, categories] = await Promise.all([
    listServices(actor, { includeInactive: true }),
    listCategories(actor),
  ]);
  const active = services.filter((s) => s.isActive);

  const prices = new Set(active.map((s) => s.priceCents));
  const uniformPrice = prices.size === 1 ? [...prices][0]! : null;

  // Receita por hora: é a métrica que revela que serviços de 120 min a preço
  // igual aos de 90 min rendem menos por hora de trabalho.
  const withRate = active.map((s) => ({
    ...s,
    hourlyRateCents: Math.round((s.priceCents / s.durationMin) * 60),
  }));
  const bestRate = Math.max(...withRate.map((s) => s.hourlyRateCents), 0);
  const worstRate = Math.min(
    ...withRate.map((s) => s.hourlyRateCents),
    Number.MAX_SAFE_INTEGER,
  );

  return (
    <div className="mx-auto max-w-[1400px] space-y-5">
      <PageHeader
        title="Serviços"
        subtitle={`${active.length} ${active.length === 1 ? "serviço ativo" : "serviços ativos"}`}
        action={
          canWrite && categories.length > 0 ? (
            <NewServiceButton categories={categories} />
          ) : undefined
        }
      />

      {services.length === 0 ? (
        <EmptyState
          title="Sem serviços no catálogo"
          description="Adicione os serviços que a equipa presta para poder começar a marcar atendimentos."
        />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <StatCard
              label="Serviços ativos"
              value={String(active.length)}
            />
            <StatCard
              label={uniformPrice !== null ? "Preço único" : "Preço médio"}
              value={
                uniformPrice !== null
                  ? formatEUR(uniformPrice)
                  : formatEUR(
                      Math.round(
                        active.reduce((s, x) => s + x.priceCents, 0) /
                          Math.max(1, active.length),
                      ),
                    )
              }
            />
            <StatCard
              label="Receita por hora"
              value={`${formatEUR(worstRate)} – ${formatEUR(bestRate)}`}
              hint="Antes de material e deslocação"
              tone={bestRate !== worstRate ? "warning" : "neutral"}
            />
          </div>

          {uniformPrice !== null && bestRate !== worstRate && (
            <Card className="border-[var(--warning)] bg-[var(--warning-bg)]">
              <p className="text-sm text-[var(--warning)]">
                Todos os serviços custam {formatEUR(uniformPrice)}, mas duram
                entre {formatDuration(Math.min(...active.map((s) => s.durationMin)))} e{" "}
                {formatDuration(Math.max(...active.map((s) => s.durationMin)))}.
                Na prática, os mais demorados rendem {formatEUR(worstRate)} por
                hora contra {formatEUR(bestRate)} dos mais rápidos — uma
                diferença de{" "}
                {Math.round(((bestRate - worstRate) / worstRate) * 100)}%.
              </p>
            </Card>
          )}

          <TableWrap>
            <thead>
              <tr>
                <Th>Serviço</Th>
                <Th align="right">Duração</Th>
                <Th align="right">Preço</Th>
                <Th align="right">Por hora</Th>
                <Th align="right">Realizados</Th>
                <Th>Estado</Th>
                {canWrite && <Th align="right">Ações</Th>}
              </tr>
            </thead>
            <tbody>
              {withRate.map((service) => (
                <tr key={service.id} className="hover:bg-[var(--surface)]">
                  <Td>
                    <span className="font-medium">{service.name}</span>
                    {service.tagline && (
                      <span className="mt-0.5 block text-xs text-[var(--text-muted)]">
                        {service.tagline}
                      </span>
                    )}
                  </Td>
                  <Td align="right">
                    <span className="tabular">
                      {formatDuration(service.durationMin)}
                    </span>
                  </Td>
                  <Td align="right">
                    <span className="tabular">
                      {formatEUR(service.priceCents)}
                    </span>
                  </Td>
                  <Td align="right">
                    <span
                      className={
                        service.hourlyRateCents === worstRate &&
                        bestRate !== worstRate
                          ? "tabular text-[var(--warning)]"
                          : "tabular"
                      }
                    >
                      {formatEUR(service.hourlyRateCents)}
                    </span>
                  </Td>
                  <Td align="right">
                    <span className="tabular text-[var(--text-muted)]">
                      {service._count.appointmentItems}
                    </span>
                  </Td>
                  <Td>
                    {service.isActive ? (
                      <Badge tone="success">Ativo</Badge>
                    ) : (
                      <Badge tone="neutral">Inativo</Badge>
                    )}
                  </Td>
                  {canWrite && (
                    <Td align="right">
                      <span className="flex justify-end gap-1.5">
                        <EditServiceButton
                          service={{
                            id: service.id,
                            name: service.name,
                            categoryId: service.categoryId,
                            tagline: service.tagline,
                            durationMin: service.durationMin,
                            setupMin: service.setupMin,
                            teardownMin: service.teardownMin,
                            priceCents: service.priceCents,
                            recommendedGapDays: service.recommendedGapDays,
                            requiresPatchTest: service.requiresPatchTest,
                            isActive: service.isActive,
                          }}
                          categories={categories}
                        />
                        {service.isActive && (
                          <DeactivateServiceButton
                            serviceId={service.id}
                            name={service.name}
                          />
                        )}
                      </span>
                    </Td>
                  )}
                </tr>
              ))}
            </tbody>
          </TableWrap>
        </>
      )}
    </div>
  );
}
