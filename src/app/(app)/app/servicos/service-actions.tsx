"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { ConfirmAction } from "@/components/ui/confirm";
import { Hint, Input, Label } from "@/components/ui/field";
import {
  createServiceAction,
  deactivateServiceAction,
  updateServiceAction,
  type ServiceFormState,
} from "./actions";

const SELECT =
  "h-11 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-2)] px-3 text-sm text-[var(--text)] focus:border-[var(--accent)] focus:outline-none";

export interface CategoryOption {
  id: string;
  name: string;
}

interface ServiceFields {
  id: string;
  name: string;
  categoryId: string;
  tagline: string | null;
  durationMin: number;
  setupMin: number;
  teardownMin: number;
  priceCents: number;
  recommendedGapDays: number | null;
  requiresPatchTest: boolean;
  isActive: boolean;
}

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "A guardar…" : label}
    </Button>
  );
}

function Feedback({ state }: { state: ServiceFormState }) {
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

function Fields({
  service,
  categories,
}: {
  service?: ServiceFields;
  categories: CategoryOption[];
}) {
  return (
    <>
      <div>
        <Label htmlFor="name" required>
          Nome
        </Label>
        <Input
          id="name"
          name="name"
          defaultValue={service?.name}
          required
          placeholder="Volume Russo"
        />
      </div>

      <div>
        <Label htmlFor="tagline">Descrição curta</Label>
        <Input
          id="tagline"
          name="tagline"
          defaultValue={service?.tagline ?? ""}
          placeholder="Volume denso e dramático"
        />
      </div>

      <div>
        <Label htmlFor="categoryId" required>
          Categoria
        </Label>
        <select
          id="categoryId"
          name="categoryId"
          className={SELECT}
          defaultValue={service?.categoryId ?? categories[0]?.id ?? ""}
          required
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="durationMin" required>
            Duração (min)
          </Label>
          <Input
            id="durationMin"
            name="durationMin"
            type="number"
            inputMode="numeric"
            min={1}
            defaultValue={service?.durationMin ?? 120}
            required
          />
        </div>
        <div>
          <Label htmlFor="price" required>
            Preço (€)
          </Label>
          <Input
            id="price"
            name="price"
            inputMode="decimal"
            defaultValue={
              service ? (service.priceCents / 100).toFixed(2) : "30.00"
            }
            required
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <Label htmlFor="setupMin">Preparação (min)</Label>
          <Input
            id="setupMin"
            name="setupMin"
            type="number"
            inputMode="numeric"
            min={0}
            defaultValue={service?.setupMin ?? 15}
          />
        </div>
        <div>
          <Label htmlFor="teardownMin">Arrumação (min)</Label>
          <Input
            id="teardownMin"
            name="teardownMin"
            type="number"
            inputMode="numeric"
            min={0}
            defaultValue={service?.teardownMin ?? 5}
          />
        </div>
        <div>
          <Label htmlFor="recommendedGapDays">Manutenção (dias)</Label>
          <Input
            id="recommendedGapDays"
            name="recommendedGapDays"
            type="number"
            inputMode="numeric"
            min={1}
            defaultValue={service?.recommendedGapDays ?? 21}
          />
          <Hint>Intervalo sugerido até voltar.</Hint>
        </div>
      </div>

      <label className="flex items-center gap-2.5 text-sm">
        <input
          type="checkbox"
          name="requiresPatchTest"
          defaultChecked={service?.requiresPatchTest ?? false}
          className="size-4 accent-[var(--accent)]"
        />
        Exige teste de sensibilidade antes
      </label>
    </>
  );
}

export function NewServiceButton({
  categories,
}: {
  categories: CategoryOption[];
}) {
  const [state, formAction] = useActionState<ServiceFormState, FormData>(
    createServiceAction,
    {},
  );

  return (
    <Dialog
      trigger={<Button type="button">Novo serviço</Button>}
      title="Novo serviço"
      wide
    >
      {(close) => (
        <form action={formAction} className="space-y-4">
          <Feedback state={state} />
          <Fields categories={categories} />
          <div className="flex gap-2">
            <Submit label="Criar serviço" />
            <Button type="button" variant="secondary" onClick={close}>
              Fechar
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}

export function EditServiceButton({
  service,
  categories,
}: {
  service: ServiceFields;
  categories: CategoryOption[];
}) {
  const [state, formAction] = useActionState<ServiceFormState, FormData>(
    updateServiceAction,
    {},
  );

  return (
    <Dialog
      trigger={
        <Button type="button" variant="ghost" size="sm">
          Editar
        </Button>
      }
      title={service.name}
      wide
    >
      {(close) => (
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="serviceId" value={service.id} />
          <Feedback state={state} />
          <Fields service={service} categories={categories} />
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

export function DeactivateServiceButton({
  serviceId,
  name,
}: {
  serviceId: string;
  name: string;
}) {
  return (
    <ConfirmAction
      action={deactivateServiceAction}
      triggerLabel="Desativar"
      triggerVariant="ghost"
      title={`Desativar ${name}?`}
      description="Deixa de aparecer nas marcações novas."
      confirmLabel="Desativar"
      danger
      hidden={{ serviceId }}
    >
      <p className="text-sm text-[var(--text-muted)]">
        O histórico mantém-se: os atendimentos passados continuam a mostrar
        este serviço. Se houver marcações futuras com ele, o sistema recusa e
        diz quantas são.
      </p>
    </ConfirmAction>
  );
}
