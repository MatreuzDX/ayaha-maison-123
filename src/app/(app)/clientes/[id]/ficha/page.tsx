import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Star } from "lucide-react";
import { requireActorPage } from "@/server/auth";
import { NotFoundError } from "@/server/errors";
import { getClient } from "@/server/services/client.service";
import {
  getLashProfile,
  listMappings,
} from "@/server/services/lash.service";
import { Badge } from "@/components/ui/badge";
import { Card, EmptyState, PageHeader } from "@/components/ui/page";
import { EyeDiagram } from "@/components/lash/eye-diagram";
import {
  EYE_SHAPE_LABELS,
  GOAL_LABELS,
  ZONE_COUNT,
  formatThickness,
  maxSafeLength,
} from "@/lib/lash";
import { fullName } from "@/lib/format";
import { formatDate, formatDuration } from "@/lib/datetime";
import { ProfileForm } from "./profile-form";
import { MappingForm } from "./mapping-form";
import {
  DuplicateMappingButton,
  RateRetentionButton,
} from "./mapping-actions";

export const metadata: Metadata = { title: "Ficha técnica" };

type Tab = "analise" | "mappings" | "novo";

const TABS: { key: Tab; label: string }[] = [
  { key: "analise", label: "Análise" },
  { key: "mappings", label: "Histórico" },
  { key: "novo", label: "Novo mapping" },
];

export default async function FichaTecnicaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const actor = await requireActorPage();
  const { id } = await params;
  const { sep } = await searchParams;

  const tab: Tab = TABS.some((t) => t.key === sep) ? (sep as Tab) : "analise";

  let client;
  try {
    client = await getClient(actor, id);
  } catch (err) {
    if (err instanceof NotFoundError) notFound();
    throw err;
  }

  const [profile, mappings] = await Promise.all([
    getLashProfile(actor, id),
    listMappings(actor, id),
  ]);

  const safeLimit = maxSafeLength(
    profile?.naturalLengthMm ?? null,
    profile?.lashStrength ?? null,
  );

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <PageHeader
        title={fullName(client.firstName, client.lastName)}
        subtitle="Ficha técnica"
        action={
          <Link
            href={`/clientes/${id}`}
            className="inline-flex h-11 items-center rounded-[var(--radius)] border border-[var(--border)] px-4 text-sm hover:bg-[var(--surface)]"
          >
            Voltar à ficha
          </Link>
        }
      />

      {safeLimit && (
        <p className="rounded-[var(--radius)] border border-[var(--accent)]/40 bg-[var(--accent)]/10 px-3 py-2 text-sm">
          Comprimento máximo seguro para esta cliente:{" "}
          <strong className="tabular">{safeLimit} mm</strong>, a partir de{" "}
          {profile?.naturalLengthMm} mm de pestana natural.
        </p>
      )}

      <nav
        aria-label="Secções da ficha técnica"
        className="flex gap-1 border-b border-[var(--border)]"
      >
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/clientes/${id}/ficha?sep=${t.key}`}
            aria-current={t.key === tab ? "page" : undefined}
            className={
              t.key === tab
                ? "border-b-2 border-[var(--accent)] px-4 py-2.5 text-sm font-medium text-[var(--text)]"
                : "border-b-2 border-transparent px-4 py-2.5 text-sm text-[var(--text-muted)] hover:text-[var(--text)]"
            }
          >
            {t.label}
            {t.key === "mappings" && mappings.length > 0 && (
              <span className="ml-1.5 text-xs text-[var(--text-muted)]">
                {mappings.length}
              </span>
            )}
          </Link>
        ))}
      </nav>

      {tab === "analise" && (
        <ProfileForm clientId={id} profile={profile} />
      )}

      {tab === "novo" && (
        <MappingForm clientId={id} maxSafeMm={safeLimit} />
      )}

      {tab === "mappings" && (
        <>
          {mappings.length === 0 ? (
            <EmptyState
              title="Ainda não há mappings"
              description="Cada aplicação guarda o desenho, os produtos e o tempo. Ao fim de algumas visitas dá para ver que estilo tem melhor retenção nesta cliente."
              actionLabel="Registar o primeiro"
              actionHref={`/clientes/${id}/ficha?sep=novo`}
            />
          ) : (
            <div className="space-y-4">
              {mappings.map((mapping) => {
                const right = mapping.zones
                  .filter((z) => z.eye === "RIGHT")
                  .sort((a, b) => a.position - b.position);
                const left = mapping.zones
                  .filter((z) => z.eye === "LEFT")
                  .sort((a, b) => a.position - b.position);

                return (
                  <Card key={mapping.id} className="space-y-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <h2 className="text-lg">{mapping.name}</h2>
                        <p className="mt-0.5 text-sm text-[var(--text-muted)]">
                          {formatDate(mapping.appliedAt)}
                          {mapping.applicationMin
                            ? ` · ${formatDuration(mapping.applicationMin)}`
                            : ""}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {mapping.curl && <Badge tone="accent">{mapping.curl}</Badge>}
                        {mapping.thicknessMicrons && (
                          <Badge>
                            {formatThickness(mapping.thicknessMicrons)}
                          </Badge>
                        )}
                        {mapping.retentionStars ? (
                          <span
                            className="flex items-center gap-0.5"
                            aria-label={`Retenção ${mapping.retentionStars} de 5`}
                          >
                            {Array.from({ length: 5 }, (_, i) => (
                              <Star
                                key={i}
                                size={14}
                                className={
                                  i < mapping.retentionStars!
                                    ? "fill-[var(--accent)] text-[var(--accent)]"
                                    : "text-[var(--border)]"
                                }
                              />
                            ))}
                          </span>
                        ) : (
                          <Badge tone="neutral">Retenção por avaliar</Badge>
                        )}
                      </div>
                    </div>

                    {right.length === ZONE_COUNT && left.length === ZONE_COUNT && (
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <p className="mb-1 text-xs text-[var(--text-muted)]">
                            Direito
                          </p>
                          <EyeDiagram
                            eye="RIGHT"
                            readOnly
                            zones={right.map((z) => ({
                              lengthMm: z.lengthMm,
                              curl: z.curl,
                              thicknessMicrons: z.thicknessMicrons,
                            }))}
                          />
                        </div>
                        <div>
                          <p className="mb-1 text-xs text-[var(--text-muted)]">
                            Esquerdo
                          </p>
                          <EyeDiagram
                            eye="LEFT"
                            readOnly
                            zones={left.map((z) => ({
                              lengthMm: z.lengthMm,
                              curl: z.curl,
                              thicknessMicrons: z.thicknessMicrons,
                            }))}
                          />
                        </div>
                      </div>
                    )}

                    {(mapping.lashBrand || mapping.glueBrand) && (
                      <p className="text-sm text-[var(--text-muted)]">
                        {[mapping.lashBrand, mapping.glueBrand, mapping.fanType]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    )}

                    {mapping.notes && (
                      <p className="text-sm whitespace-pre-wrap text-[var(--text-muted)]">
                        {mapping.notes}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-2 border-t border-[var(--border)] pt-3">
                      <RateRetentionButton
                        mappingId={mapping.id}
                        clientId={id}
                        mappingName={mapping.name}
                        current={mapping.retentionStars}
                      />
                      <DuplicateMappingButton
                        mappingId={mapping.id}
                        clientId={id}
                        mappingName={mapping.name}
                      />
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      {tab === "analise" && profile && (
        <Card>
          <h2 className="text-lg">Resumo</h2>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {profile.eyeShape && (
              <Badge>{EYE_SHAPE_LABELS[profile.eyeShape]}</Badge>
            )}
            {profile.goals.map((goal) => (
              <Badge key={goal} tone="accent">
                {GOAL_LABELS[goal]}
              </Badge>
            ))}
            {profile.wishlist.map((wish) => (
              <Badge key={wish} tone="info">
                Quer experimentar: {wish}
              </Badge>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
