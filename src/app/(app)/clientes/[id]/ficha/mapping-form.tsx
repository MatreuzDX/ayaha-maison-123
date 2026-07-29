"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Hint, Input, Label } from "@/components/ui/field";
import { Card } from "@/components/ui/page";
import { EyeDiagram, type ZoneValue } from "@/components/lash/eye-diagram";
import {
  CURLS,
  CURL_HINTS,
  MAPPING_PRESETS,
  THICKNESSES_MICRONS,
  ZONE_COUNT,
  formatThickness,
  suggestLengths,
} from "@/lib/lash";
import type { LashCurl } from "@prisma/client";
import { createMappingAction, type LashFormState } from "./actions";

const SELECT =
  "h-11 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-2)] px-3 text-sm text-[var(--text)] focus:border-[var(--accent)] focus:outline-none";

function blankZones(): ZoneValue[] {
  return Array.from({ length: ZONE_COUNT }, () => ({
    lengthMm: 10,
    curl: null,
    thicknessMicrons: null,
  }));
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "A guardar…" : "Guardar mapping"}
    </Button>
  );
}

export function MappingForm({
  clientId,
  maxSafeMm,
}: {
  clientId: string;
  maxSafeMm: number | null;
}) {
  const [state, formAction] = useActionState<LashFormState, FormData>(
    createMappingAction,
    {},
  );

  const [right, setRight] = useState<ZoneValue[]>(blankZones);
  const [left, setLeft] = useState<ZoneValue[]>(blankZones);
  const [linked, setLinked] = useState(true);

  /**
   * Aplica um estilo pré-definido aos dois olhos.
   *
   * Poupa o passo mais aborrecido: em vez de clicar zona a zona, escolhe-se
   * "Fox Eyes" e ajusta-se o que for preciso.
   */
  function applyPreset(name: string) {
    const preset = MAPPING_PRESETS.find((p) => p.name === name);
    if (!preset) return;

    const lengths = suggestLengths(preset.peak, 8, 13);
    const zones = lengths.map((mm) => ({
      lengthMm: mm,
      curl: null,
      thicknessMicrons: null,
    }));
    setRight(zones);
    setLeft(zones.map((z) => ({ ...z })));
  }

  function updateRight(index: number, value: ZoneValue) {
    setRight((prev) => prev.map((z, i) => (i === index ? value : z)));
    // Os olhos são simétricos por defeito. Quem precisar de os separar
    // desliga a ligação — acontece quando um olho é mais caído que o outro.
    if (linked) {
      setLeft((prev) => prev.map((z, i) => (i === index ? { ...value } : z)));
    }
  }

  function updateLeft(index: number, value: ZoneValue) {
    setLeft((prev) => prev.map((z, i) => (i === index ? value : z)));
    if (linked) {
      setRight((prev) => prev.map((z, i) => (i === index ? { ...value } : z)));
    }
  }

  // As zonas viajam como JSON num campo escondido: 10 zonas × 3 campos daria
  // 30 inputs soltos e um formulário ilegível.
  const zonesPayload = JSON.stringify([
    ...right.map((z, i) => ({ eye: "RIGHT", position: i + 1, ...z })),
    ...left.map((z, i) => ({ eye: "LEFT", position: i + 1, ...z })),
  ]);

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <input type="hidden" name="clientId" value={clientId} />
      <input type="hidden" name="zones" value={zonesPayload} />

      {state.error && (
        <div
          role="alert"
          className="rounded-[var(--radius)] border border-[var(--danger)] bg-[var(--danger-bg)] px-3 py-2.5 text-sm text-[var(--danger)]"
        >
          {state.error}
        </div>
      )}
      {state.warning && (
        <div
          role="alert"
          className="rounded-[var(--radius)] border border-[var(--warning)] bg-[var(--warning-bg)] px-3 py-2.5 text-sm text-[var(--warning)]"
        >
          {state.warning}
        </div>
      )}

      <Card className="space-y-4">
        <h2 className="text-lg">Estilo</h2>

        <div>
          <Label htmlFor="name" required>
            Nome do mapping
          </Label>
          <Input
            id="name"
            name="name"
            list="mapping-presets"
            required
            placeholder="Fox Eyes"
            onChange={(e) => applyPreset(e.target.value)}
          />
          <datalist id="mapping-presets">
            {MAPPING_PRESETS.map((p) => (
              <option key={p.name} value={p.name}>
                {p.hint}
              </option>
            ))}
          </datalist>
          <Hint>
            Escolher um estilo conhecido preenche o diagrama com um ponto de
            partida.
          </Hint>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <Label htmlFor="curl">Curvatura base</Label>
            <select id="curl" name="curl" className={SELECT} defaultValue="">
              <option value="">Não definida</option>
              {CURLS.map((curl) => (
                <option key={curl} value={curl}>
                  {curl} — {CURL_HINTS[curl as LashCurl]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="thicknessMicrons">Espessura</Label>
            <select
              id="thicknessMicrons"
              name="thicknessMicrons"
              className={SELECT}
              defaultValue=""
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
            <Label htmlFor="fanType">Tipo de leque</Label>
            <Input
              id="fanType"
              name="fanType"
              placeholder="3D, 5D, clássico…"
            />
          </div>
        </div>
      </Card>

      <Card className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg">Diagrama</h2>
            <p className="mt-0.5 text-sm text-[var(--text-muted)]">
              Comprimentos do canto interno ao externo.
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={linked}
              onChange={(e) => setLinked(e.target.checked)}
              className="size-4 accent-[var(--accent)]"
            />
            Olhos simétricos
          </label>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <div>
            <p className="mb-1 text-sm font-medium">Olho direito</p>
            <EyeDiagram
              eye="RIGHT"
              zones={right}
              onChange={updateRight}
              maxSafeMm={maxSafeMm}
            />
          </div>
          <div>
            <p className="mb-1 text-sm font-medium">Olho esquerdo</p>
            <EyeDiagram
              eye="LEFT"
              zones={left}
              onChange={updateLeft}
              maxSafeMm={maxSafeMm}
            />
          </div>
        </div>
      </Card>

      <Card className="space-y-4">
        <h2 className="text-lg">Produtos e aplicação</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="lashBrand">Marca das pestanas</Label>
            <Input id="lashBrand" name="lashBrand" />
          </div>
          <div>
            <Label htmlFor="glueBrand">Marca da cola</Label>
            <Input id="glueBrand" name="glueBrand" />
          </div>
          <div>
            <Label htmlFor="primerBrand">Primer</Label>
            <Input id="primerBrand" name="primerBrand" />
          </div>
          <div>
            <Label htmlFor="removerBrand">Removedor</Label>
            <Input id="removerBrand" name="removerBrand" />
          </div>
        </div>

        <div>
          <Label htmlFor="otherProducts">Outros produtos</Label>
          <Input id="otherProducts" name="otherProducts" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="fansPerEye">Número de fios por olho</Label>
            <Input
              id="fansPerEye"
              name="fansPerEye"
              type="number"
              inputMode="numeric"
              min={0}
            />
          </div>
          <div>
            <Label htmlFor="applicationMin">Tempo de aplicação (min)</Label>
            <Input
              id="applicationMin"
              name="applicationMin"
              type="number"
              inputMode="numeric"
              min={0}
              max={600}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="recommendedProducts">
            Produtos recomendados à cliente
          </Label>
          <Input
            id="recommendedProducts"
            name="recommendedProducts"
            placeholder="Espuma de limpeza, escovilhão…"
          />
        </div>
      </Card>

      <Card>
        <Label htmlFor="notes">Observações</Label>
        <textarea
          id="notes"
          name="notes"
          rows={5}
          placeholder="Como correu a aplicação, o que ajustar da próxima vez…"
          className="w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--text)] focus:border-[var(--accent)] focus:outline-none"
        />
      </Card>

      <SubmitButton />
    </form>
  );
}
