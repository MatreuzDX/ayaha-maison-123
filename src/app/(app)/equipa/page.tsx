import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireActorPage } from "@/server/auth";
import { can } from "@/server/permissions";
import { listProfessionals } from "@/server/services/professional.service";
import { Badge } from "@/components/ui/badge";
import { Card, EmptyState, PageHeader } from "@/components/ui/page";
import { formatMinuteOfDay } from "@/lib/datetime";
import { initials } from "@/lib/format";

export const metadata: Metadata = { title: "Equipa" };

const WEEKDAYS = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
];

export default async function EquipaPage() {
  const actor = await requireActorPage();
  if (!can(actor, "professional:read")) redirect("/");

  const team = await listProfessionals(actor);

  return (
    <div className="mx-auto max-w-[1400px] space-y-5">
      <PageHeader
        title="Equipa"
        subtitle={`${team.length} ${team.length === 1 ? "profissional" : "profissionais"}`}
      />

      {team.length === 0 ? (
        <EmptyState
          title="Sem profissionais registadas"
          description="Adicione as profissionais da equipa para poder atribuir atendimentos e horários."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {team.map((professional) => {
            const hoursByDay = new Map<number, typeof professional.workingHours>();
            for (const h of professional.workingHours) {
              const list = hoursByDay.get(h.weekday) ?? [];
              list.push(h);
              hoursByDay.set(h.weekday, list);
            }

            return (
              <Card key={professional.id} className="space-y-3">
                <div className="flex items-start gap-3">
                  <div
                    className="flex size-11 shrink-0 items-center justify-center rounded-full text-sm font-medium"
                    style={{
                      backgroundColor: `${professional.color}25`,
                      color: professional.color,
                    }}
                    aria-hidden="true"
                  >
                    {initials(professional.displayName)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">
                      {professional.displayName}
                    </p>
                    <p className="truncate text-xs text-[var(--text-muted)]">
                      {professional.user.email}
                    </p>
                  </div>
                  {professional.isBookable ? (
                    <Badge tone="success">Disponível</Badge>
                  ) : (
                    <Badge tone="neutral">Indisponível</Badge>
                  )}
                </div>

                <div className="flex flex-wrap gap-1.5 text-xs">
                  <Badge>{professional.contractType}</Badge>
                  <Badge>{professional._count.skills} serviços</Badge>
                  <Badge>{professional._count.appointments} atendimentos</Badge>
                </div>

                <div className="border-t border-[var(--border)] pt-3">
                  <p className="mb-1.5 text-xs tracking-wide text-[var(--text-muted)] uppercase">
                    Horário
                  </p>
                  {hoursByDay.size === 0 ? (
                    <p className="text-sm text-[var(--text-muted)]">
                      Sem horário definido.
                    </p>
                  ) : (
                    <ul className="space-y-0.5 text-sm">
                      {[...hoursByDay.entries()]
                        .sort(([a], [b]) => a - b)
                        .map(([weekday, blocks]) => (
                          <li
                            key={weekday}
                            className="flex justify-between gap-2"
                          >
                            <span className="text-[var(--text-muted)]">
                              {WEEKDAYS[weekday]}
                            </span>
                            <span className="tabular">
                              {blocks
                                .map(
                                  (b) =>
                                    `${formatMinuteOfDay(b.startMin)}–${formatMinuteOfDay(b.endMin)}`,
                                )
                                .join(", ")}
                            </span>
                          </li>
                        ))}
                    </ul>
                  )}
                </div>

                <p className="text-xs text-[var(--text-muted)]">
                  Desloca-se até {professional.maxTravelMin} min
                  {professional.hasVehicle ? " · tem viatura" : ""}
                </p>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
