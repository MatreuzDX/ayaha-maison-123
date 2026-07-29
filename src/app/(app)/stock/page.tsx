import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireActorPage } from "@/server/auth";
import { can, canAll } from "@/server/permissions";
import { listMaterials, stockSummary } from "@/server/services/stock.service";
import { Badge } from "@/components/ui/badge";
import {
  EmptyState,
  PageHeader,
  StatCard,
  TableWrap,
  Td,
  Th,
} from "@/components/ui/page";
import { SearchInput } from "@/components/ui/search-filters";
import { formatEUR } from "@/lib/money";
import { formatQuantity } from "@/lib/format";

export const metadata: Metadata = { title: "Stock" };

export default async function StockPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const actor = await requireActorPage();
  if (!can(actor, "inventory:read")) redirect("/");

  const params = await searchParams;
  const showCost = canAll(actor, "inventory:cost");

  const [materials, summary] = await Promise.all([
    listMaterials(actor, { search: params.q }),
    stockSummary(actor),
  ]);

  return (
    <div className="mx-auto max-w-[1400px] space-y-5">
      <PageHeader
        title="Stock"
        subtitle={`${summary.total} ${summary.total === 1 ? "material" : "materiais"}`}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Materiais" value={String(summary.total)} />
        <StatCard
          label="Abaixo do mínimo"
          value={String(summary.low)}
          hint="Precisam de reposição"
          tone={summary.low > 0 ? "warning" : "success"}
        />
        {showCost && (
          <StatCard
            label="Valor em stock"
            value={formatEUR(summary.totalValueCents)}
          />
        )}
      </div>

      <SearchInput placeholder="Nome, marca ou referência…" />

      {materials.length === 0 ? (
        <EmptyState
          title={params.q ? "Sem resultados" : "Sem materiais registados"}
          description={
            params.q
              ? "Nenhum material corresponde a esta pesquisa."
              : "Registe os materiais que a equipa usa para acompanhar consumos e receber alertas de reposição."
          }
        />
      ) : (
        <TableWrap>
          <thead>
            <tr>
              <Th>Material</Th>
              <Th align="right">Em stock</Th>
              <Th align="right">Mínimo</Th>
              {showCost && <Th align="right">Custo unitário</Th>}
              <Th>Estado</Th>
            </tr>
          </thead>
          <tbody>
            {materials.map((material) => (
              <tr key={material.id} className="hover:bg-[var(--surface)]">
                <Td>
                  <span className="font-medium">{material.name}</span>
                  {material.category && (
                    <span className="mt-0.5 block text-xs text-[var(--text-muted)]">
                      {material.category}
                    </span>
                  )}
                </Td>
                <Td align="right">
                  <span
                    className={
                      material.isLow
                        ? "tabular font-medium text-[var(--warning)]"
                        : "tabular"
                    }
                  >
                    {formatQuantity(material.quantityOnHand, material.unit_)}
                  </span>
                </Td>
                <Td align="right">
                  <span className="tabular text-[var(--text-muted)]">
                    {formatQuantity(material.minQuantity, material.unit_)}
                  </span>
                </Td>
                {showCost && (
                  <Td align="right">
                    <span className="tabular">
                      {formatEUR(material.costCents)}
                    </span>
                  </Td>
                )}
                <Td>
                  {material.isLow ? (
                    <Badge tone="warning">Repor</Badge>
                  ) : (
                    <Badge tone="success">Suficiente</Badge>
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}
    </div>
  );
}
