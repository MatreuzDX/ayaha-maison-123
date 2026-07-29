import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ClientStatus } from "@prisma/client";
import { requireActorPage } from "@/server/auth";
import { can } from "@/server/permissions";
import { clientCounts, listClients } from "@/server/services/client.service";
import { prisma } from "@/server/db";
import { Button } from "@/components/ui/button";
import { ClientStatusBadge } from "@/components/ui/badge";
import {
  EmptyState,
  PageHeader,
  StatCard,
  TableWrap,
  Td,
  Th,
} from "@/components/ui/page";
import {
  FilterSelect,
  Pagination,
  SearchInput,
} from "@/components/ui/search-filters";
import { formatEUR } from "@/lib/money";
import { formatPhone, fullName } from "@/lib/format";
import { formatRelativeDays } from "@/lib/datetime";

export const metadata: Metadata = { title: "Clientes" };

const STATUS_OPTIONS = [
  { value: "LEAD", label: "Contacto" },
  { value: "ACTIVE", label: "Ativa" },
  { value: "AT_RISK", label: "Em risco" },
  { value: "DORMANT", label: "Adormecida" },
  { value: "BLOCKED", label: "Bloqueada" },
];

const VALID_STATUSES = new Set(STATUS_OPTIONS.map((o) => o.value));

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const actor = await requireActorPage();
  if (!can(actor, "client:read")) redirect("/");

  const params = await searchParams;

  // O status vem do URL, que qualquer pessoa pode editar. Validar contra a
  // lista conhecida evita passar lixo ao Prisma.
  const status =
    params.status && VALID_STATUSES.has(params.status)
      ? (params.status as ClientStatus)
      : undefined;

  const [result, counts, zones] = await Promise.all([
    listClients(actor, {
      search: params.q,
      status,
      travelZoneId: params.zona,
      page: Number(params.page) || 1,
    }),
    clientCounts(actor),
    prisma.travelZone.findMany({
      where: { unitId: actor.unitId, isActive: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const hasFilters = Boolean(params.q || params.status || params.zona);

  return (
    <div className="mx-auto max-w-[1600px] space-y-5">
      <PageHeader
        title="Clientes"
        subtitle={`${counts.total} ${counts.total === 1 ? "ficha" : "fichas"}`}
        action={
          can(actor, "client:create") && (
            <Link href="/clientes/nova">
              <Button>Nova cliente</Button>
            </Link>
          )
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Ativas" value={String(counts.ACTIVE)} tone="success" />
        <StatCard
          label="Em risco"
          value={String(counts.AT_RISK)}
          hint="45–90 dias sem voltar"
          tone={counts.AT_RISK > 0 ? "warning" : "neutral"}
        />
        <StatCard
          label="Adormecidas"
          value={String(counts.DORMANT)}
          hint="Mais de 90 dias"
          tone={counts.DORMANT > 0 ? "danger" : "neutral"}
        />
        <StatCard label="Contactos" value={String(counts.LEAD)} />
      </div>

      <div className="flex flex-wrap gap-2">
        <SearchInput placeholder="Nome, telefone ou e-mail…" />
        <FilterSelect
          paramName="status"
          label="Filtrar por estado"
          allLabel="Todos os estados"
          options={STATUS_OPTIONS}
        />
        {zones.length > 0 && (
          <FilterSelect
            paramName="zona"
            label="Filtrar por zona"
            allLabel="Todas as zonas"
            options={zones.map((z) => ({ value: z.id, label: z.name }))}
          />
        )}
      </div>

      {result.items.length === 0 ? (
        <EmptyState
          title={hasFilters ? "Sem resultados" : "Ainda não há clientes"}
          description={
            hasFilters
              ? "Nenhuma ficha corresponde a estes filtros. Experimente limpar a pesquisa."
              : "Quando registar a primeira cliente, ela aparece aqui com o histórico de atendimentos e o cartão de fidelidade."
          }
          actionLabel={can(actor, "client:create") ? "Nova cliente" : undefined}
          actionHref="/clientes/nova"
        />
      ) : (
        <>
          <TableWrap>
            <thead>
              <tr>
                <Th>Nome</Th>
                <Th>Contacto</Th>
                <Th>Estado</Th>
                <Th>Zona</Th>
                <Th align="right">Visitas</Th>
                <Th align="right">Total gasto</Th>
                <Th>Última visita</Th>
              </tr>
            </thead>
            <tbody>
              {result.items.map((client) => (
                <tr key={client.id} className="hover:bg-[var(--surface)]">
                  <Td>
                    <Link
                      href={`/clientes/${client.id}`}
                      className="font-medium text-[var(--text)] hover:text-[var(--accent)] hover:underline"
                    >
                      {fullName(client.firstName, client.lastName)}
                    </Link>
                    {client.ownerProfessional && (
                      <span className="mt-0.5 block text-xs text-[var(--text-muted)]">
                        {client.ownerProfessional.displayName}
                      </span>
                    )}
                  </Td>
                  <Td>
                    <span className="tabular text-[var(--text-muted)]">
                      {formatPhone(client.phone)}
                    </span>
                  </Td>
                  <Td>
                    <ClientStatusBadge status={client.status} />
                  </Td>
                  <Td>
                    <span className="text-[var(--text-muted)]">
                      {client.travelZone?.name ?? "—"}
                    </span>
                  </Td>
                  <Td align="right">
                    <span className="tabular">{client.visitCount}</span>
                  </Td>
                  <Td align="right">
                    <span className="tabular">
                      {formatEUR(client.lifetimeValueCents)}
                    </span>
                  </Td>
                  <Td>
                    <span className="text-[var(--text-muted)]">
                      {client.lastVisitAt
                        ? formatRelativeDays(client.lastVisitAt)
                        : "Nunca"}
                    </span>
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableWrap>

          <Pagination
            page={result.page}
            totalPages={result.totalPages}
            total={result.total}
          />
        </>
      )}
    </div>
  );
}
