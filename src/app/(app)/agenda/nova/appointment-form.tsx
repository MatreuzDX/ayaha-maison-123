"use client";

import { useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Hint, Label } from "@/components/ui/field";
import { Card } from "@/components/ui/page";
import { formatEUR } from "@/lib/money";
import { formatDuration } from "@/lib/datetime";
import {
  createAppointmentAction,
  type AppointmentFormState,
} from "../actions";

interface ClientOption {
  id: string;
  name: string;
  zoneName: string | null;
  zoneFeeCents: number;
  zoneFreeAboveCents: number | null;
}

interface ServiceOption {
  id: string;
  name: string;
  durationMin: number;
  priceCents: number;
}

interface ProfessionalOption {
  id: string;
  displayName: string;
  color: string;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "A marcar…" : "Criar marcação"}
    </Button>
  );
}

const SELECT_CLASS =
  "h-11 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-2)] px-3 text-sm text-[var(--text)] focus:border-[var(--accent)] focus:outline-none";

export function AppointmentForm({
  clients,
  services,
  professionals,
  defaultClientId,
}: {
  clients: ClientOption[];
  services: ServiceOption[];
  professionals: ProfessionalOption[];
  defaultClientId?: string;
}) {
  const [state, formAction] = useActionState<AppointmentFormState, FormData>(
    createAppointmentAction,
    {},
  );

  const [clientId, setClientId] = useState(defaultClientId ?? "");
  const [selectedServices, setSelectedServices] = useState<string[]>([]);

  const client = clients.find((c) => c.id === clientId);

  // O resumo é calculado no cliente só para dar retorno imediato. Os valores
  // que contam são recalculados no servidor — nunca se confia num total que
  // veio do browser.
  const summary = useMemo(() => {
    const chosen = services.filter((s) => selectedServices.includes(s.id));
    const subtotalCents = chosen.reduce((sum, s) => sum + s.priceCents, 0);
    const durationMin = chosen.reduce((sum, s) => sum + s.durationMin, 0);

    let travelFeeCents = 0;
    if (client && chosen.length > 0) {
      const free =
        client.zoneFreeAboveCents !== null &&
        subtotalCents >= client.zoneFreeAboveCents;
      travelFeeCents = free ? 0 : client.zoneFeeCents;
    }

    return {
      count: chosen.length,
      subtotalCents,
      travelFeeCents,
      totalCents: subtotalCents + travelFeeCents,
      durationMin,
    };
  }, [selectedServices, services, client]);

  function toggleService(id: string) {
    setSelectedServices((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {state.error && (
        <div
          role="alert"
          className="rounded-[var(--radius)] border border-[var(--danger)] bg-[var(--danger-bg)] px-3 py-2.5 text-sm text-[var(--danger)]"
        >
          {state.error}
        </div>
      )}

      <Card className="space-y-4">
        <h2 className="text-lg">Quem e quando</h2>

        <div>
          <Label htmlFor="clientId" required>
            Cliente
          </Label>
          <select
            id="clientId"
            name="clientId"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            required
            className={SELECT_CLASS}
          >
            <option value="">Escolher cliente…</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.zoneName ? ` — ${c.zoneName}` : ""}
              </option>
            ))}
          </select>
          {client?.zoneName && (
            <Hint>
              Zona {client.zoneName} · deslocação{" "}
              {formatEUR(client.zoneFeeCents)}
              {client.zoneFreeAboveCents !== null &&
                `, grátis acima de ${formatEUR(client.zoneFreeAboveCents)}`}
            </Hint>
          )}
        </div>

        <div>
          <Label htmlFor="professionalId" required>
            Profissional
          </Label>
          <select
            id="professionalId"
            name="professionalId"
            required
            className={SELECT_CLASS}
          >
            <option value="">Escolher profissional…</option>
            {professionals.map((p) => (
              <option key={p.id} value={p.id}>
                {p.displayName}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="date" required>
              Data
            </Label>
            <input
              id="date"
              name="date"
              type="date"
              min={today}
              required
              className={SELECT_CLASS}
            />
          </div>
          <div>
            <Label htmlFor="time" required>
              Hora de início
            </Label>
            <input
              id="time"
              name="time"
              type="time"
              step={900}
              required
              className={SELECT_CLASS}
            />
            <Hint>A hora de partida é calculada automaticamente.</Hint>
          </div>
        </div>
      </Card>

      <Card className="space-y-3">
        <h2 className="text-lg">Serviços</h2>

        <div className="grid gap-2 sm:grid-cols-2">
          {services.map((service) => {
            const checked = selectedServices.includes(service.id);
            return (
              <label
                key={service.id}
                className={
                  checked
                    ? "flex cursor-pointer items-start gap-2.5 rounded-[var(--radius)] border border-[var(--accent)] bg-[var(--accent)]/10 p-3"
                    : "flex cursor-pointer items-start gap-2.5 rounded-[var(--radius)] border border-[var(--border)] p-3 hover:bg-[var(--surface)]"
                }
              >
                <input
                  type="checkbox"
                  name="serviceIds"
                  value={service.id}
                  checked={checked}
                  onChange={() => toggleService(service.id)}
                  className="mt-0.5 size-4 accent-[var(--accent)]"
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">
                    {service.name}
                  </span>
                  <span className="tabular mt-0.5 block text-xs text-[var(--text-muted)]">
                    {formatDuration(service.durationMin)} ·{" "}
                    {formatEUR(service.priceCents)}
                  </span>
                </span>
              </label>
            );
          })}
        </div>

        {summary.count > 0 && (
          <div className="rounded-[var(--radius)] bg-[var(--surface)] p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">
                {summary.count}{" "}
                {summary.count === 1 ? "serviço" : "serviços"} ·{" "}
                {formatDuration(summary.durationMin)}
              </span>
              <span className="tabular">
                {formatEUR(summary.subtotalCents)}
              </span>
            </div>
            {summary.travelFeeCents > 0 && (
              <div className="mt-1 flex justify-between">
                <span className="text-[var(--text-muted)]">Deslocação</span>
                <span className="tabular">
                  {formatEUR(summary.travelFeeCents)}
                </span>
              </div>
            )}
            <div className="mt-2 flex justify-between border-t border-[var(--border)] pt-2 font-medium">
              <span>Total</span>
              <span className="tabular">{formatEUR(summary.totalCents)}</span>
            </div>
          </div>
        )}
      </Card>

      <Card className="space-y-4">
        <h2 className="text-lg">Notas</h2>
        <div>
          <Label htmlFor="clientNotes">Pedido da cliente</Label>
          <textarea
            id="clientNotes"
            name="clientNotes"
            rows={2}
            className="w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--text)] focus:border-[var(--accent)] focus:outline-none"
          />
        </div>
        <div>
          <Label htmlFor="internalNotes">Nota interna</Label>
          <textarea
            id="internalNotes"
            name="internalNotes"
            rows={2}
            className="w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--text)] focus:border-[var(--accent)] focus:outline-none"
          />
        </div>
      </Card>

      <div className="flex gap-2">
        <SubmitButton />
        <Link href="/agenda">
          <Button type="button" variant="secondary">
            Cancelar
          </Button>
        </Link>
      </div>
    </form>
  );
}
