import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireActorPage } from "@/server/auth";
import { can, permissionsOf, ROLE_LABELS } from "@/server/permissions";
import { prisma } from "@/server/db";
import { Badge } from "@/components/ui/badge";
import { Card, PageHeader } from "@/components/ui/page";
import { IS_DEMO } from "@/lib/demo";
import { formatEUR } from "@/lib/money";

export const metadata: Metadata = { title: "Definições" };

export default async function DefinicoesPage() {
  const actor = await requireActorPage();
  if (!can(actor, "settings:write")) redirect("/");

  const [unit, zones, program] = await Promise.all([
    prisma.unit.findUnique({ where: { id: actor.unitId } }),
    prisma.travelZone.findMany({
      where: { unitId: actor.unitId },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.loyaltyProgram.findUnique({
      where: { unitId: actor.unitId },
      include: { rewards: { orderBy: { sortOrder: "asc" } } },
    }),
  ]);

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <PageHeader title="Definições" subtitle={unit?.name} />

      {IS_DEMO && (
        <Card className="border-[var(--warning)] bg-[var(--warning-bg)]">
          <p className="font-medium text-[var(--warning)]">
            Modo demonstração ativo
          </p>
          <p className="mt-1 text-sm text-[var(--warning)]">
            O ecrã de entrada mostra um botão de acesso rápido e aceitam-se
            palavras-passe curtas. Em produção isto é impossível: a aplicação
            recusa arrancar com o modo demonstração ligado.
          </p>
        </Card>
      )}

      <Card>
        <h2 className="text-lg">Unidade</h2>
        <dl className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-xs tracking-wide text-[var(--text-muted)] uppercase">
              Nome
            </dt>
            <dd className="mt-0.5 text-sm">{unit?.name}</dd>
          </div>
          <div>
            <dt className="text-xs tracking-wide text-[var(--text-muted)] uppercase">
              Base
            </dt>
            <dd className="mt-0.5 text-sm">{unit?.baseAddress ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs tracking-wide text-[var(--text-muted)] uppercase">
              Fuso horário
            </dt>
            <dd className="mt-0.5 text-sm">{unit?.timezone}</dd>
          </div>
          <div>
            <dt className="text-xs tracking-wide text-[var(--text-muted)] uppercase">
              Moeda
            </dt>
            <dd className="mt-0.5 text-sm">{unit?.currency}</dd>
          </div>
        </dl>
      </Card>

      <Card>
        <h2 className="text-lg">Zonas de deslocação</h2>
        <p className="mt-0.5 text-sm text-[var(--text-muted)]">
          O código postal da cliente define automaticamente a zona e a taxa.
        </p>

        <ul className="mt-3 divide-y divide-[var(--border)]">
          {zones.map((zone) => (
            <li
              key={zone.id}
              className="flex flex-wrap items-center justify-between gap-2 py-2.5"
            >
              <div>
                <p className="text-sm font-medium">{zone.name}</p>
                <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                  ~{zone.estimatedMin} min ·{" "}
                  {zone.postalPrefixes.length} prefixos postais
                </p>
              </div>
              <div className="text-right text-sm">
                <p className="tabular">{formatEUR(zone.feeCents)}</p>
                {zone.freeAboveCents !== null && (
                  <p className="text-xs text-[var(--text-muted)]">
                    Grátis acima de {formatEUR(zone.freeAboveCents)}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      </Card>

      {program && (
        <Card>
          <h2 className="text-lg">{program.name}</h2>
          <p className="mt-0.5 text-sm text-[var(--text-muted)]">
            {program.stampsRequired} carimbos completam um cartão. Ao completar,
            a cliente escolhe uma recompensa e o cartão recomeça.
          </p>

          <ul className="mt-3 space-y-2">
            {program.rewards.map((reward) => (
              <li
                key={reward.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius)] border border-[var(--border)] px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium">{reward.name}</p>
                  {reward.description && (
                    <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                      {reward.description}
                    </p>
                  )}
                </div>
                {reward.valueCents > 0 ? (
                  <Badge tone="accent">{formatEUR(reward.valueCents)}</Badge>
                ) : (
                  <Badge tone="warning">Sem valor definido</Badge>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card>
        <h2 className="text-lg">O seu acesso</h2>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Badge tone="accent">{ROLE_LABELS[actor.role]}</Badge>
          <span className="text-sm text-[var(--text-muted)]">
            {permissionsOf(actor.role).length} permissões
          </span>
        </div>
      </Card>
    </div>
  );
}
