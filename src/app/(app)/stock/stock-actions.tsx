"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Hint, Input, Label } from "@/components/ui/field";
import { formatQuantity } from "@/lib/format";
import {
  adjustStockAction,
  createMaterialAction,
  updateMaterialAction,
  type StockFormState,
} from "./actions";

const SELECT =
  "h-11 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-2)] px-3 text-sm text-[var(--text)] focus:border-[var(--accent)] focus:outline-none";

/** Movimentos que a equipa regista à mão. O consumo é automático ao concluir. */
const MOVEMENTS = [
  { value: "PURCHASE", label: "Compra — entrou material", adds: true },
  { value: "ADJUSTMENT", label: "Correção de contagem", adds: true },
  { value: "RETURN", label: "Devolução ao fornecedor", adds: false },
  { value: "LOSS", label: "Perda ou desperdício", adds: false },
] as const;

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "A guardar…" : label}
    </Button>
  );
}

function Feedback({ state }: { state: StockFormState }) {
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

interface MaterialFields {
  id?: string;
  name?: string;
  brand?: string | null;
  category?: string | null;
  unit?: string;
  quantityOnHand?: number;
  minQuantity?: number;
  reorderQuantity?: number;
  costCents?: number;
  sku?: string | null;
}

function MaterialFormFields({
  material,
  isNew,
}: {
  material?: MaterialFields;
  isNew: boolean;
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
          defaultValue={material?.name}
          required
          placeholder="Cola Premium 5ml"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="brand">Marca</Label>
          <Input id="brand" name="brand" defaultValue={material?.brand ?? ""} />
        </div>
        <div>
          <Label htmlFor="category">Categoria</Label>
          <Input
            id="category"
            name="category"
            defaultValue={material?.category ?? ""}
            placeholder="COLA, FIOS, LIMPEZA…"
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="unit" required>
            Unidade
          </Label>
          <Input
            id="unit"
            name="unit"
            defaultValue={material?.unit ?? "un"}
            required
            placeholder="un, ml, cartela, par"
          />
        </div>
        <div>
          <Label htmlFor="cost">Custo por unidade (€)</Label>
          <Input
            id="cost"
            name="cost"
            inputMode="decimal"
            defaultValue={
              material?.costCents ? (material.costCents / 100).toFixed(2) : ""
            }
            placeholder="4,50"
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {isNew && (
          <div>
            <Label htmlFor="quantityOnHand">Quantidade atual</Label>
            <Input
              id="quantityOnHand"
              name="quantityOnHand"
              inputMode="decimal"
              defaultValue="0"
            />
          </div>
        )}
        <div>
          <Label htmlFor="minQuantity">Mínimo</Label>
          <Input
            id="minQuantity"
            name="minQuantity"
            inputMode="decimal"
            defaultValue={material?.minQuantity ?? 0}
          />
          <Hint>Abaixo disto aparece o alerta.</Hint>
        </div>
        <div>
          <Label htmlFor="reorderQuantity">Repor</Label>
          <Input
            id="reorderQuantity"
            name="reorderQuantity"
            inputMode="decimal"
            defaultValue={material?.reorderQuantity ?? 0}
          />
        </div>
      </div>

      {!isNew && (
        <p className="rounded-[var(--radius)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-muted)]">
          A quantidade em stock não se edita aqui — muda por movimento, para o
          histórico nunca ter saltos sem explicação. Use “Movimentar”.
        </p>
      )}
    </>
  );
}

export function NewMaterialButton() {
  const [state, formAction] = useActionState<StockFormState, FormData>(
    createMaterialAction,
    {},
  );

  return (
    <Dialog
      trigger={<Button type="button">Novo material</Button>}
      title="Novo material"
      description="A quantidade inicial fica registada como movimento."
      wide
    >
      {(close) => (
        <form action={formAction} className="space-y-4">
          <Feedback state={state} />
          <MaterialFormFields isNew />
          <div className="flex gap-2">
            <Submit label="Criar material" />
            <Button type="button" variant="secondary" onClick={close}>
              Fechar
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}

export function EditMaterialButton({
  material,
}: {
  material: MaterialFields & { id: string };
}) {
  const [state, formAction] = useActionState<StockFormState, FormData>(
    updateMaterialAction,
    {},
  );

  return (
    <Dialog
      trigger={
        <Button type="button" variant="ghost" size="sm">
          Editar
        </Button>
      }
      title={material.name ?? "Material"}
      wide
    >
      {(close) => (
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="materialId" value={material.id} />
          <Feedback state={state} />
          <MaterialFormFields material={material} isNew={false} />
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

export function AdjustStockButton({
  materialId,
  name,
  quantityOnHand,
  unit,
}: {
  materialId: string;
  name: string;
  quantityOnHand: number;
  unit: string;
}) {
  const [state, formAction] = useActionState<StockFormState, FormData>(
    adjustStockAction,
    {},
  );
  const [kind, setKind] = useState<string>("PURCHASE");

  const movement = MOVEMENTS.find((m) => m.value === kind);
  const adds = movement?.adds ?? true;

  return (
    <Dialog
      trigger={
        <Button type="button" variant="secondary" size="sm">
          Movimentar
        </Button>
      }
      title={name}
      description={`Em stock: ${formatQuantity(quantityOnHand, unit)}`}
    >
      {(close) => (
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="materialId" value={materialId} />
          <Feedback state={state} />

          <div>
            <Label htmlFor="kind">O que aconteceu</Label>
            <select
              id="kind"
              name="kind"
              value={kind}
              onChange={(e) => setKind(e.target.value)}
              className={SELECT}
            >
              {MOVEMENTS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="amount" required>
              Quantidade ({unit})
            </Label>
            <Input
              id="amount"
              name="amount"
              inputMode="decimal"
              required
              autoFocus
              placeholder="1"
            />
            {/* O sinal vem do tipo de movimento — quem preenche escreve sempre
                um número positivo e o sistema trata do resto. */}
            <Hint>
              {adds
                ? `Vai somar ao stock atual (${formatQuantity(quantityOnHand, unit)}).`
                : `Vai subtrair do stock atual (${formatQuantity(quantityOnHand, unit)}).`}
            </Hint>
          </div>

          <div>
            <Label htmlFor="note">
              Nota {kind === "LOSS" ? "" : "(opcional)"}
            </Label>
            <Input
              id="note"
              name="note"
              required={kind === "LOSS"}
              placeholder={
                kind === "LOSS"
                  ? "Frasco entornado"
                  : "Fatura 123, fornecedor X"
              }
            />
            {kind === "LOSS" && (
              <Hint>
                Obrigatória nas perdas — é o que permite perceber padrões de
                desperdício.
              </Hint>
            )}
          </div>

          <div className="flex gap-2">
            <Submit label="Registar" />
            <Button type="button" variant="secondary" onClick={close}>
              Cancelar
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}
