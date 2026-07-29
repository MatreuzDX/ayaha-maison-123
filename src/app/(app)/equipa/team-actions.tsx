"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Hint, Input, Label } from "@/components/ui/field";
import {
  setWorkingHoursAction,
  updateProfessionalAction,
  type TeamFormState,
} from "./actions";

const WEEKDAYS = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
];

export interface WorkingHourValue {
  weekday: number;
  startMin: number;
  endMin: number;
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "A guardar…" : label}
    </Button>
  );
}

function Feedback({ state }: { state: TeamFormState }) {
  if (state.error) {
    return (
      <p
        role="alert"
        className="rounded-[var(--radius)] border border-[var(--danger)] bg-[var(--danger-bg)] px-3 py-2 text-sm text-[var(--danger)]"
      >
        {state.error}
      </p>
    );
  }
  if (state.ok) {
    return (
      <p
        role="status"
        className="rounded-[var(--radius)] border border-[var(--success)] bg-[var(--success-bg)] px-3 py-2 text-sm text-[var(--success)]"
      >
        {state.ok}
      </p>
    );
  }
  return null;
}

export function EditProfessionalButton({
  professional,
}: {
  professional: {
    id: string;
    displayName: string;
    bio: string | null;
    color: string;
    isBookable: boolean;
    maxTravelMin: number;
    hasVehicle: boolean;
    transportMode: string;
  };
}) {
  const [state, formAction] = useActionState<TeamFormState, FormData>(
    updateProfessionalAction,
    {},
  );

  return (
    <Dialog
      trigger={
        <Button type="button" variant="ghost" size="sm">
          Editar
        </Button>
      }
      title={professional.displayName}
      wide
    >
      {(close) => (
        <form action={formAction} className="space-y-4">
          <input
            type="hidden"
            name="professionalId"
            value={professional.id}
          />
          <Feedback state={state} />

          <div>
            <Label htmlFor="displayName" required>
              Nome
            </Label>
            <Input
              id="displayName"
              name="displayName"
              defaultValue={professional.displayName}
              required
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="color">Cor na agenda</Label>
              <input
                id="color"
                name="color"
                type="color"
                defaultValue={professional.color}
                className="h-11 w-full cursor-pointer rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-2)] px-1"
              />
              <Hint>Distingue as marcações de cada uma.</Hint>
            </div>
            <div>
              <Label htmlFor="maxTravelMin">Deslocação máxima (min)</Label>
              <Input
                id="maxTravelMin"
                name="maxTravelMin"
                type="number"
                inputMode="numeric"
                min={0}
                defaultValue={professional.maxTravelMin}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="transportMode">Como se desloca</Label>
            <Input
              id="transportMode"
              name="transportMode"
              defaultValue={professional.transportMode}
              placeholder="CAR, TRANSIT, WALK"
            />
          </div>

          <div>
            <Label htmlFor="bio">Nota interna</Label>
            <textarea
              id="bio"
              name="bio"
              rows={3}
              defaultValue={professional.bio ?? ""}
              className="w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--text)] focus:border-[var(--accent)] focus:outline-none"
            />
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2.5 text-sm">
              <input
                type="checkbox"
                name="isBookable"
                defaultChecked={professional.isBookable}
                className="size-4 accent-[var(--accent)]"
              />
              Disponível para marcações
            </label>
            <label className="flex items-center gap-2.5 text-sm">
              <input
                type="checkbox"
                name="hasVehicle"
                defaultChecked={professional.hasVehicle}
                className="size-4 accent-[var(--accent)]"
              />
              Tem viatura própria
            </label>
          </div>

          <div className="flex gap-2">
            <Submit label="Guardar" />
            <Button type="button" variant="secondary" onClick={close}>
              Fechar
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}

export function EditHoursButton({
  professionalId,
  displayName,
  hours,
}: {
  professionalId: string;
  displayName: string;
  hours: WorkingHourValue[];
}) {
  const [state, formAction] = useActionState<TeamFormState, FormData>(
    setWorkingHoursAction,
    {},
  );

  // Um bloco por dia. O modelo permite vários blocos diários (manhã e tarde),
  // mas a AYAHA trabalha em turno corrido — mostrar dois campos por dia
  // complicaria o ecrã sem servir ninguém hoje.
  const byDay = new Map(hours.map((h) => [h.weekday, h]));

  return (
    <Dialog
      trigger={
        <Button type="button" variant="secondary" size="sm">
          Horário
        </Button>
      }
      title={`Horário de ${displayName}`}
      description="Deixe em branco os dias de folga."
      wide
    >
      {(close) => (
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="professionalId" value={professionalId} />
          <Feedback state={state} />

          <div className="space-y-2">
            {WEEKDAYS.map((label, weekday) => {
              const existing = byDay.get(weekday);
              return (
                <div
                  key={weekday}
                  className="flex flex-wrap items-center gap-2"
                >
                  <span className="w-20 shrink-0 text-sm">{label}</span>
                  <input
                    type="time"
                    name={`start-${weekday}`}
                    aria-label={`${label} — início`}
                    defaultValue={
                      existing ? minutesToTime(existing.startMin) : ""
                    }
                    className="h-10 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-2)] px-2 text-sm"
                  />
                  <span className="text-[var(--text-muted)]">–</span>
                  <input
                    type="time"
                    name={`end-${weekday}`}
                    aria-label={`${label} — fim`}
                    defaultValue={existing ? minutesToTime(existing.endMin) : ""}
                    className="h-10 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-2)] px-2 text-sm"
                  />
                </div>
              );
            })}
          </div>

          <p className="rounded-[var(--radius)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-muted)]">
            O horário define a disponibilidade na agenda. Marcações já feitas
            fora do novo horário não são apagadas — ficam como estão.
          </p>

          <div className="flex gap-2">
            <Submit label="Guardar horário" />
            <Button type="button" variant="secondary" onClick={close}>
              Fechar
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}
