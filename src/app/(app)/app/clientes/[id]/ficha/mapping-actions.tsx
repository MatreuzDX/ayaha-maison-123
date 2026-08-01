"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input, Label } from "@/components/ui/field";
import { ConfirmAction } from "@/components/ui/confirm";
import {
  duplicateMappingAction,
  rateRetentionAction,
  type LashFormState,
} from "./actions";

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "A guardar…" : label}
    </Button>
  );
}

/**
 * Avaliação da retenção, de 1 a 5.
 *
 * É a informação mais valiosa da ficha técnica e a mais fácil de perder: só se
 * sabe como correu quando a cliente volta, três semanas depois. Por isso o
 * botão vive ao lado de cada mapping antigo, e não escondido num menu.
 */
export function RateRetentionButton({
  mappingId,
  clientId,
  mappingName,
  current,
}: {
  mappingId: string;
  clientId: string;
  mappingName: string;
  current: number | null;
}) {
  const [state, formAction] = useActionState<LashFormState, FormData>(
    rateRetentionAction,
    {},
  );
  const [stars, setStars] = useState(current ?? 0);

  return (
    <Dialog
      trigger={
        <Button type="button" variant="secondary" size="sm">
          {current ? "Alterar retenção" : "Avaliar retenção"}
        </Button>
      }
      title="Como aguentou?"
      description={`${mappingName} — avalie de 1 a 5`}
    >
      {(close) => (
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="mappingId" value={mappingId} />
          <input type="hidden" name="clientId" value={clientId} />
          <input type="hidden" name="stars" value={stars} />

          {state.error && (
            <p
              role="alert"
              className="rounded-[var(--radius)] border border-[var(--danger)] bg-[var(--danger-bg)] px-3 py-2 text-sm text-[var(--danger)]"
            >
              {state.error}
            </p>
          )}

          <fieldset>
            <legend className="mb-2 text-sm font-medium">Retenção</legend>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setStars(value)}
                  aria-label={`${value} de 5`}
                  aria-pressed={stars === value}
                  className="rounded p-1.5 hover:bg-[var(--surface)]"
                >
                  <Star
                    size={26}
                    className={
                      value <= stars
                        ? "fill-[var(--accent)] text-[var(--accent)]"
                        : "text-[var(--border)]"
                    }
                  />
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-[var(--text-muted)]">
              {stars === 0 && "Escolha uma classificação."}
              {stars === 1 && "Caiu quase tudo na primeira semana."}
              {stars === 2 && "Aguentou pouco."}
              {stars === 3 && "Razoável, dentro do esperado."}
              {stars === 4 && "Boa retenção."}
              {stars === 5 && "Excelente — chegou inteira à manutenção."}
            </p>
          </fieldset>

          <div>
            <Label htmlFor={`nota-${mappingId}`}>Nota</Label>
            <Input
              id={`nota-${mappingId}`}
              name="retentionNote"
              placeholder="Caiu mais no canto externo"
            />
          </div>

          <div className="flex gap-2">
            <Submit label="Guardar" />
            <Button type="button" variant="secondary" onClick={close}>
              Cancelar
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}

/**
 * Repete um mapping numa nova aplicação.
 *
 * O caso mais comum na cadeira: a cliente gostou e quer o mesmo. Copia o
 * diagrama e os produtos, com data de hoje e retenção por avaliar.
 */
export function DuplicateMappingButton({
  mappingId,
  clientId,
  mappingName,
}: {
  mappingId: string;
  clientId: string;
  mappingName: string;
}) {
  return (
    <ConfirmAction
      action={duplicateMappingAction}
      triggerLabel="Repetir"
      triggerVariant="ghost"
      title={`Repetir ${mappingName}?`}
      description="Cria uma aplicação nova com data de hoje."
      confirmLabel="Repetir"
      hidden={{ mappingId, clientId }}
    >
      <p className="text-sm text-[var(--text-muted)]">
        Copia o diagrama, a curvatura, a espessura e os produtos. A retenção
        fica por avaliar, porque é uma aplicação nova.
      </p>
    </ConfirmAction>
  );
}
