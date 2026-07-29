"use client";

import { useId, useState } from "react";
import {
  CURLS,
  EYE_LABELS,
  LENGTHS_MM,
  THICKNESSES_MICRONS,
  ZONE_COUNT,
  ZONE_LABELS,
  ZONE_SHORT,
  formatThickness,
  type EyeSide,
} from "@/lib/lash";
import type { LashCurl } from "@prisma/client";
import { cn } from "@/lib/utils";

/**
 * Diagrama do olho com zonas editáveis.
 *
 * Substitui o desenho à mão na ficha de papel. Cada zona guarda o comprimento
 * aplicado e, quando é preciso, curvatura e espessura próprias — há mappings
 * que mudam a curvatura só no canto externo.
 *
 * Nota de orientação: o canto interno (zona 1) fica à DIREITA no olho esquerdo
 * e à ESQUERDA no olho direito, como se estivéssemos de frente para a cliente.
 * Desenhar sempre do mesmo lado tornaria o esquema inútil na hora de aplicar.
 */

export interface ZoneValue {
  lengthMm: number;
  curl: LashCurl | null;
  thicknessMicrons: number | null;
}

const MIN_LENGTH = LENGTHS_MM[0]!;
const MAX_LENGTH = LENGTHS_MM[LENGTHS_MM.length - 1]!;

/** Altura em píxeis da pestana desenhada, a partir do comprimento em mm. */
function lashHeight(mm: number): number {
  const ratio = (mm - MIN_LENGTH) / (MAX_LENGTH - MIN_LENGTH);
  return 22 + ratio * 62;
}

/**
 * Cor por comprimento: do bege ao dourado escuro.
 *
 * Dá para ler o desenho de relance — onde está o volume, onde está o pico —
 * sem precisar de olhar para os números.
 */
function lashColor(mm: number): string {
  const ratio = (mm - MIN_LENGTH) / (MAX_LENGTH - MIN_LENGTH);
  const lightness = 74 - ratio * 32;
  return `hsl(40 45% ${lightness}%)`;
}

export function EyeDiagram({
  eye,
  zones,
  onChange,
  maxSafeMm,
  readOnly = false,
}: {
  eye: EyeSide;
  zones: ZoneValue[];
  onChange?: (index: number, value: ZoneValue) => void;
  /** Acima disto a extensão é pesada de mais para a pestana natural. */
  maxSafeMm?: number | null;
  readOnly?: boolean;
}) {
  const [selected, setSelected] = useState(0);
  const titleId = useId();

  // O olho esquerdo é o direito espelhado. Desenhamos uma vez e viramos.
  const flip = eye === "LEFT";

  const width = 420;
  const height = 220;
  const lidY = 150;
  const firstX = 62;
  const lastX = 358;
  const step = (lastX - firstX) / (ZONE_COUNT - 1);

  function update(index: number, patch: Partial<ZoneValue>) {
    if (readOnly || !onChange) return;
    const current = zones[index];
    if (!current) return;
    onChange(index, { ...current, ...patch });
  }

  function onZoneKey(event: React.KeyboardEvent, index: number) {
    if (readOnly) return;
    const zone = zones[index];
    if (!zone) return;

    // Setas verticais mudam o comprimento; horizontais mudam de zona. É o que
    // permite preencher o mapa inteiro sem tirar as mãos do teclado.
    if (event.key === "ArrowUp" || event.key === "ArrowRight") {
      event.preventDefault();
      update(index, { lengthMm: Math.min(MAX_LENGTH, zone.lengthMm + 1) });
    } else if (event.key === "ArrowDown" || event.key === "ArrowLeft") {
      event.preventDefault();
      update(index, { lengthMm: Math.max(MIN_LENGTH, zone.lengthMm - 1) });
    }
  }

  const active = zones[selected];

  return (
    <div className="space-y-3">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        role="group"
        aria-labelledby={titleId}
      >
        <title id={titleId}>
          {EYE_LABELS[eye]} — comprimentos por zona, do canto interno ao externo
        </title>

        <g transform={flip ? `translate(${width},0) scale(-1,1)` : undefined}>
          {/* Contorno do olho */}
          <path
            d={`M 40 ${lidY} Q 210 ${lidY - 78} 380 ${lidY} Q 210 ${lidY + 46} 40 ${lidY} Z`}
            fill="var(--surface)"
            stroke="var(--border)"
            strokeWidth={1.5}
          />
          {/* Íris */}
          <circle
            cx={210}
            cy={lidY - 8}
            r={27}
            fill="var(--border)"
            opacity={0.5}
          />
          <circle cx={210} cy={lidY - 8} r={11} fill="var(--text-muted)" opacity={0.5} />

          {zones.map((zone, index) => {
            const x = firstX + index * step;
            const h = lashHeight(zone.lengthMm);
            const color = lashColor(zone.lengthMm);
            const unsafe = maxSafeMm != null && zone.lengthMm > maxSafeMm;
            const isSelected = index === selected;

            // A pestana inclina-se para fora à medida que se afasta do centro,
            // como acontece no olho real.
            const lean = (index - (ZONE_COUNT - 1) / 2) * 7;

            return (
              <g key={index}>
                {[-11, 0, 11].map((offset, k) => (
                  <line
                    key={k}
                    x1={x + offset}
                    y1={lidY - 10}
                    x2={x + offset + lean}
                    y2={lidY - 10 - h}
                    stroke={unsafe ? "var(--danger)" : color}
                    strokeWidth={isSelected ? 4 : 3}
                    strokeLinecap="round"
                  />
                ))}

                {/* Zona clicável, maior do que o desenho para acertar com o dedo. */}
                <rect
                  x={x - 22}
                  y={lidY - 10 - h - 12}
                  width={44}
                  height={h + 40}
                  fill="transparent"
                  stroke={isSelected ? "var(--accent)" : "transparent"}
                  strokeWidth={1.5}
                  strokeDasharray="3 3"
                  rx={8}
                  className={readOnly ? undefined : "cursor-pointer"}
                  role={readOnly ? undefined : "button"}
                  tabIndex={readOnly ? undefined : 0}
                  aria-label={`${ZONE_LABELS[index]}: ${zone.lengthMm} mm`}
                  onClick={() => setSelected(index)}
                  onFocus={() => setSelected(index)}
                  onKeyDown={(e) => onZoneKey(e, index)}
                />
              </g>
            );
          })}
        </g>

        {/* Números fora do grupo espelhado, senão sairiam ao contrário. */}
        {zones.map((zone, index) => {
          const rawX = firstX + index * step;
          const x = flip ? width - rawX : rawX;
          return (
            <g key={index}>
              <text
                x={x}
                y={lidY + 34}
                textAnchor="middle"
                className="tabular"
                fontSize={15}
                fontWeight={index === selected ? 700 : 500}
                fill={
                  maxSafeMm != null && zone.lengthMm > maxSafeMm
                    ? "var(--danger)"
                    : "var(--text)"
                }
              >
                {zone.lengthMm}
              </text>
              <text
                x={x}
                y={lidY + 50}
                textAnchor="middle"
                fontSize={10}
                fill="var(--text-muted)"
              >
                {ZONE_SHORT[index]}
              </text>
            </g>
          );
        })}
      </svg>

      {maxSafeMm != null &&
        zones.some((z) => z.lengthMm > maxSafeMm) && (
          <p
            role="alert"
            className="rounded-[var(--radius)] border border-[var(--danger)] bg-[var(--danger-bg)] px-3 py-2 text-sm text-[var(--danger)]"
          >
            Há zonas acima de {maxSafeMm} mm, o limite seguro para a pestana
            natural desta cliente. Acima disto a extensão pesa de mais e cai
            antes do tempo.
          </p>
        )}

      {!readOnly && active && (
        <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-3">
          <p className="mb-2 text-sm font-medium">{ZONE_LABELS[selected]}</p>

          <div className="space-y-3">
            <div>
              <label
                htmlFor={`${titleId}-len`}
                className="mb-1 block text-xs text-[var(--text-muted)]"
              >
                Comprimento
              </label>
              <div className="flex flex-wrap gap-1">
                {LENGTHS_MM.map((mm) => (
                  <button
                    key={mm}
                    id={mm === active.lengthMm ? `${titleId}-len` : undefined}
                    type="button"
                    onClick={() => update(selected, { lengthMm: mm })}
                    aria-pressed={mm === active.lengthMm}
                    className={cn(
                      "tabular h-9 w-11 rounded-[var(--radius)] border text-sm transition-colors",
                      mm === active.lengthMm
                        ? "border-[var(--accent)] bg-[var(--accent)] font-medium text-[var(--accent-fg)]"
                        : "border-[var(--border)] hover:bg-[var(--surface-2)]",
                      maxSafeMm != null &&
                        mm > maxSafeMm &&
                        mm !== active.lengthMm &&
                        "text-[var(--danger)]",
                    )}
                  >
                    {mm}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label
                  htmlFor={`${titleId}-curl`}
                  className="mb-1 block text-xs text-[var(--text-muted)]"
                >
                  Curvatura nesta zona
                </label>
                <select
                  id={`${titleId}-curl`}
                  value={active.curl ?? ""}
                  onChange={(e) =>
                    update(selected, {
                      curl: (e.target.value || null) as LashCurl | null,
                    })
                  }
                  className="h-10 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-2)] px-2 text-sm"
                >
                  <option value="">Igual ao mapping</option>
                  {CURLS.map((curl) => (
                    <option key={curl} value={curl}>
                      {curl}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor={`${titleId}-thick`}
                  className="mb-1 block text-xs text-[var(--text-muted)]"
                >
                  Espessura nesta zona
                </label>
                <select
                  id={`${titleId}-thick`}
                  value={active.thicknessMicrons ?? ""}
                  onChange={(e) =>
                    update(selected, {
                      thicknessMicrons: e.target.value
                        ? Number(e.target.value)
                        : null,
                    })
                  }
                  className="h-10 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-2)] px-2 text-sm"
                >
                  <option value="">Igual ao mapping</option>
                  {THICKNESSES_MICRONS.map((microns) => (
                    <option key={microns} value={microns}>
                      {formatThickness(microns)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <p className="mt-2 text-xs text-[var(--text-muted)]">
            Clique numa zona do desenho ou use as setas do teclado.
          </p>
        </div>
      )}
    </div>
  );
}

/** Versão só de leitura, para o histórico. Compacta, sem controlos. */
export function EyeDiagramPreview({
  eye,
  zones,
}: {
  eye: EyeSide;
  zones: ZoneValue[];
}) {
  return <EyeDiagram eye={eye} zones={zones} readOnly />;
}
