import type { Metadata } from "next";
import Link from "next/link";
import { requireActorPage } from "@/server/auth";
import { can, clientScope } from "@/server/permissions";
import { prisma } from "@/server/db";
import { formatEUR } from "@/lib/money";
import { lisbonEndOfDay, lisbonStartOfDay, formatDayHeading } from "@/lib/datetime";

export const metadata: Metadata = { title: "Início" };

/** Cartão de KPI. Os números do dashboard vêm sempre das mesmas funções que
 *  alimentam os relatórios — nunca de contas feitas à parte (spec 22.4). */
function Kpi({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "neutral" | "success" | "warning" | "danger";
}) {
  const toneClass = {
    neutral: "text-[var(--text)]",
    success: "text-[var(--success)]",
    warning: "text-[var(--warning)]",
    danger: "text-[var(--danger)]",
  }[tone];

  return (
    <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-2)] p-4">
      <p className="text-xs tracking-wide text-[var(--text-muted)] uppercase">
        {label}
      </p>
      <p className={`tabular mt-1.5 text-2xl font-medium ${toneClass}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-[var(--text-muted)]">{hint}</p>}
    </div>
  );
}

export default async function DashboardPage() {
  const actor = await requireActorPage();
  const now = new Date();

  const clientWhere = can(actor, "client:read") ? clientScope(actor) : null;

  const [clientCount, atRiskCount, todayCount, monthRevenue] = await Promise.all([
    clientWhere ? prisma.client.count({ where: clientWhere }) : 0,
    clientWhere
      ? prisma.client.count({ where: { ...clientWhere, status: "AT_RISK" } })
      : 0,
    prisma.appointment.count({
      where: {
        unitId: actor.unitId,
        deletedAt: null,
        startAt: { gte: lisbonStartOfDay(now), lte: lisbonEndOfDay(now) },
        status: { notIn: ["CANCELLED"] },
      },
    }),
    prisma.appointment.aggregate({
      where: {
        unitId: actor.unitId,
        deletedAt: null,
        status: "COMPLETED",
        completedAt: {
          gte: new Date(now.getFullYear(), now.getMonth(), 1),
        },
      },
      _sum: { totalCents: true },
    }),
  ]);

  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      <div>
        <h1 className="text-2xl">Início</h1>
        <p className="mt-0.5 text-sm text-[var(--text-muted)]">
          {formatDayHeading(now)}
        </p>
      </div>

      <section aria-labelledby="kpis">
        <h2 id="kpis" className="sr-only">
          Indicadores
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi label="Atendimentos hoje" value={String(todayCount)} />
          <Kpi
            label="Faturação do mês"
            value={formatEUR(monthRevenue._sum.totalCents ?? 0)}
          />
          <Kpi label="Clientes" value={String(clientCount)} />
          <Kpi
            label="Em risco"
            value={String(atRiskCount)}
            hint="45–90 dias sem voltar"
            tone={atRiskCount > 0 ? "warning" : "neutral"}
          />
        </div>
      </section>

      <section className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-2)] p-5">
        <h2 className="text-lg">Atalhos</h2>
        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          {can(actor, "appointment:create") && (
            <Link
              href="/agenda/nova"
              className="rounded-[var(--radius)] bg-[var(--accent)] px-3 py-2 font-medium text-[var(--accent-fg)] hover:bg-[var(--accent-hover)]"
            >
              Nova marcação
            </Link>
          )}
          {can(actor, "client:create") && (
            <Link
              href="/clientes/nova"
              className="rounded-[var(--radius)] border border-[var(--border)] px-3 py-2 hover:border-[var(--accent)]"
            >
              Nova cliente
            </Link>
          )}
          {can(actor, "appointment:read") && (
            <Link
              href="/agenda"
              className="rounded-[var(--radius)] border border-[var(--border)] px-3 py-2 hover:border-[var(--accent)]"
            >
              Ver agenda
            </Link>
          )}
          {can(actor, "inventory:read") && (
            <Link
              href="/stock"
              className="rounded-[var(--radius)] border border-[var(--border)] px-3 py-2 hover:border-[var(--accent)]"
            >
              Stock
            </Link>
          )}
        </div>
      </section>
    </div>
  );
}
