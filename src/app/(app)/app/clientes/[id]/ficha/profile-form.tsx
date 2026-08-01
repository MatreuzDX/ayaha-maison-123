"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { LashProfile } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Hint, Input, Label } from "@/components/ui/field";
import { Card } from "@/components/ui/page";
import {
  CURLS,
  EYE_SHAPE_LABELS,
  EYE_SPACING_LABELS,
  EYE_TILT_LABELS,
  FACE_SHAPE_LABELS,
  GOAL_ADVICE,
  GOAL_LABELS,
  SCALE3_LABELS,
  THICKNESSES_MICRONS,
  formatThickness,
} from "@/lib/lash";
import { saveProfileAction, type LashFormState } from "./actions";

const SELECT =
  "h-11 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-2)] px-3 text-sm text-[var(--text)] focus:border-[var(--accent)] focus:outline-none";

function Select({
  id,
  labels,
  defaultValue,
}: {
  id: string;
  labels: Record<string, string>;
  defaultValue?: string | null;
}) {
  return (
    <select id={id} name={id} className={SELECT} defaultValue={defaultValue ?? ""}>
      <option value="">Não definido</option>
      {Object.entries(labels).map(([value, label]) => (
        <option key={value} value={value}>
          {label}
        </option>
      ))}
    </select>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "A guardar…" : "Guardar análise"}
    </Button>
  );
}

export function ProfileForm({
  clientId,
  profile,
}: {
  clientId: string;
  profile: LashProfile | null;
}) {
  const [state, formAction] = useActionState<LashFormState, FormData>(
    saveProfileAction,
    {},
  );

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <input type="hidden" name="clientId" value={clientId} />

      {state.error && (
        <div
          role="alert"
          className="rounded-[var(--radius)] border border-[var(--danger)] bg-[var(--danger-bg)] px-3 py-2.5 text-sm text-[var(--danger)]"
        >
          {state.error}
        </div>
      )}
      {state.ok && (
        <div
          role="status"
          className="rounded-[var(--radius)] border border-[var(--success)] bg-[var(--success-bg)] px-3 py-2.5 text-sm text-[var(--success)]"
        >
          {state.ok}
        </div>
      )}

      <Card className="space-y-4">
        <div>
          <h2 className="text-lg">Análise Natural</h2>
          <p className="mt-0.5 text-sm text-[var(--text-muted)]">
            O ponto de partida. É isto que define o que é seguro aplicar.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <Label htmlFor="eyeColor">Cor dos olhos</Label>
            <Input
              id="eyeColor"
              name="eyeColor"
              defaultValue={profile?.eyeColor ?? ""}
              placeholder="Castanhos"
            />
          </div>
          <div>
            <Label htmlFor="eyeShape">Formato dos olhos</Label>
            <Select
              id="eyeShape"
              labels={EYE_SHAPE_LABELS}
              defaultValue={profile?.eyeShape}
            />
          </div>
          <div>
            <Label htmlFor="eyeSpacing">Distância entre olhos</Label>
            <Select
              id="eyeSpacing"
              labels={EYE_SPACING_LABELS}
              defaultValue={profile?.eyeSpacing}
            />
          </div>
          <div>
            <Label htmlFor="eyeSize">Tamanho dos olhos</Label>
            <Select
              id="eyeSize"
              labels={SCALE3_LABELS}
              defaultValue={profile?.eyeSize}
            />
          </div>
          <div>
            <Label htmlFor="eyeTilt">Inclinação</Label>
            <Select
              id="eyeTilt"
              labels={EYE_TILT_LABELS}
              defaultValue={profile?.eyeTilt}
            />
          </div>
          <div>
            <Label htmlFor="faceShape">Formato do rosto</Label>
            <Select
              id="faceShape"
              labels={FACE_SHAPE_LABELS}
              defaultValue={profile?.faceShape}
            />
          </div>
          <div>
            <Label htmlFor="skinTone">Cor da pele</Label>
            <Input
              id="skinTone"
              name="skinTone"
              defaultValue={profile?.skinTone ?? ""}
            />
          </div>
          <div>
            <Label htmlFor="naturalColor">Cor natural das pestanas</Label>
            <Input
              id="naturalColor"
              name="naturalColor"
              defaultValue={profile?.naturalColor ?? ""}
            />
          </div>
          <div>
            <Label htmlFor="growthDirection">Direção do crescimento</Label>
            <Input
              id="growthDirection"
              name="growthDirection"
              defaultValue={profile?.growthDirection ?? ""}
              placeholder="Reta, cruzada…"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <Label htmlFor="naturalLengthMm">Comprimento natural (mm)</Label>
            <Input
              id="naturalLengthMm"
              name="naturalLengthMm"
              type="number"
              inputMode="numeric"
              min={1}
              max={20}
              defaultValue={profile?.naturalLengthMm ?? ""}
            />
            <Hint>Define o comprimento máximo seguro no diagrama.</Hint>
          </div>
          <div>
            <Label htmlFor="naturalThicknessMicrons">Espessura natural</Label>
            <select
              id="naturalThicknessMicrons"
              name="naturalThicknessMicrons"
              className={SELECT}
              defaultValue={profile?.naturalThicknessMicrons ?? ""}
            >
              <option value="">Não definida</option>
              {THICKNESSES_MICRONS.map((microns) => (
                <option key={microns} value={microns}>
                  {formatThickness(microns)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="naturalCurl">Curvatura natural</Label>
            <select
              id="naturalCurl"
              name="naturalCurl"
              className={SELECT}
              defaultValue={profile?.naturalCurl ?? ""}
            >
              <option value="">Não definida</option>
              {CURLS.map((curl) => (
                <option key={curl} value={curl}>
                  {curl}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="naturalDensity">Quantidade de pestanas</Label>
            <Select
              id="naturalDensity"
              labels={SCALE3_LABELS}
              defaultValue={profile?.naturalDensity}
            />
          </div>
          <div>
            <Label htmlFor="lashStrength">Resistência</Label>
            <Select
              id="lashStrength"
              labels={SCALE3_LABELS}
              defaultValue={profile?.lashStrength}
            />
            <Hint>Pestanas fracas aguentam menos comprimento.</Hint>
          </div>
          <div>
            <Label htmlFor="eyeSensitivity">Sensibilidade ocular</Label>
            <Select
              id="eyeSensitivity"
              labels={SCALE3_LABELS}
              defaultValue={profile?.eyeSensitivity}
            />
          </div>
        </div>

        <label className="flex items-center gap-2.5 text-sm">
          <input
            type="checkbox"
            name="wearsGlasses"
            defaultChecked={profile?.wearsGlasses ?? false}
            className="size-4 accent-[var(--accent)]"
          />
          Usa óculos
        </label>

        <p className="rounded-[var(--radius)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-muted)]">
          Alergias, lentes de contacto, sensibilidade à cola e reações
          anteriores ficam na <strong>ficha de saúde</strong>, que tem
          tratamento próprio de dados sensíveis. Não são duplicadas aqui.
        </p>
      </Card>

      <Card className="space-y-4">
        <div>
          <h2 className="text-lg">Análise de Visagismo</h2>
          <p className="mt-0.5 text-sm text-[var(--text-muted)]">
            O que a cliente quer alcançar. Orienta a escolha do mapping.
          </p>
        </div>

        <fieldset>
          <legend className="mb-2 text-sm font-medium">
            Objetivos da cliente
          </legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {Object.entries(GOAL_LABELS).map(([value, label]) => (
              <label
                key={value}
                className="flex cursor-pointer items-start gap-2.5 rounded-[var(--radius)] border border-[var(--border)] p-2.5 hover:bg-[var(--surface)]"
              >
                <input
                  type="checkbox"
                  name="goals"
                  value={value}
                  defaultChecked={profile?.goals?.includes(value as never)}
                  className="mt-0.5 size-4 shrink-0 accent-[var(--accent)]"
                />
                <span className="min-w-0">
                  <span className="block text-sm">{label}</span>
                  <span className="mt-0.5 block text-xs text-[var(--text-muted)]">
                    {GOAL_ADVICE[value as keyof typeof GOAL_ADVICE]}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <Label htmlFor="wishlist">Lista de desejos</Label>
          <Input
            id="wishlist"
            name="wishlist"
            defaultValue={profile?.wishlist?.join(", ") ?? ""}
            placeholder="Wet Look, Anime"
          />
          <Hint>Efeitos que gostaria de experimentar, separados por vírgula.</Hint>
        </div>

        <div>
          <Label htmlFor="visagismNotes">Notas de visagismo</Label>
          <textarea
            id="visagismNotes"
            name="visagismNotes"
            rows={4}
            defaultValue={profile?.visagismNotes ?? ""}
            className="w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--text)] focus:border-[var(--accent)] focus:outline-none"
          />
        </div>
      </Card>

      <SubmitButton />
    </form>
  );
}
