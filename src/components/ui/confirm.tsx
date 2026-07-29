"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";

/**
 * Botão para ações difíceis de reverter.
 *
 * Confirma sempre num diálogo, com o nome do que vai ser afetado escrito por
 * extenso. Um `confirm()` do browser não diz o que está prestes a desaparecer,
 * e clicar "OK" por reflexo é fácil de mais quando se está a meio de um
 * atendimento.
 */

export interface ConfirmState {
  error?: string;
  ok?: string;
}

function SubmitButton({
  label,
  danger,
}: {
  label: string;
  danger: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant={danger ? "danger" : "primary"}
      disabled={pending}
    >
      {pending ? "A processar…" : label}
    </Button>
  );
}

export function ConfirmAction({
  action,
  triggerLabel,
  triggerVariant = "secondary",
  title,
  description,
  confirmLabel,
  danger = false,
  hidden,
  children,
}: {
  action: (prev: ConfirmState, form: FormData) => Promise<ConfirmState>;
  triggerLabel: string;
  triggerVariant?: "primary" | "secondary" | "ghost" | "danger";
  title: string;
  description: string;
  confirmLabel: string;
  danger?: boolean;
  /** Campos escondidos que a ação precisa (ids, por exemplo). */
  hidden: Record<string, string>;
  /** Campos adicionais — por exemplo o motivo de um cancelamento. */
  children?: React.ReactNode;
}) {
  const [state, formAction] = useActionState<ConfirmState, FormData>(action, {});

  return (
    <Dialog
      trigger={
        <Button type="button" variant={triggerVariant} size="sm">
          {triggerLabel}
        </Button>
      }
      title={title}
      description={description}
    >
      {(close) => (
        <form
          action={async (form) => {
            await formAction(form);
            close();
          }}
          className="space-y-4"
        >
          {Object.entries(hidden).map(([key, value]) => (
            <input key={key} type="hidden" name={key} value={value} />
          ))}

          {state.error && (
            <p
              role="alert"
              className="rounded-[var(--radius)] border border-[var(--danger)] bg-[var(--danger-bg)] px-3 py-2 text-sm text-[var(--danger)]"
            >
              {state.error}
            </p>
          )}

          {children}

          <div className="flex gap-2">
            <SubmitButton label={confirmLabel} danger={danger} />
            <Button type="button" variant="secondary" onClick={close}>
              Cancelar
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}
