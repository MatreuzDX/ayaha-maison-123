"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { ConfirmAction } from "@/components/ui/confirm";
import { approveClientAccountAction, deleteClientAction } from "./actions";
import type { FormState } from "./actions";

/**
 * Apagar uma ficha de cliente.
 *
 * Não apaga mesmo — marca como apagada e esconde-a das listas. O histórico de
 * atendimentos, faturas e comissões depende desta linha, e apagá-la a sério
 * deixaria a contabilidade com buracos. Para apagar de verdade existe o pedido
 * RGPD de eliminação, que é um processo à parte e auditado.
 */
export function DeleteClientButton({
  clientId,
  clientName,
  visitCount,
}: {
  clientId: string;
  clientName: string;
  visitCount: number;
}) {
  return (
    <ConfirmAction
      action={deleteClientAction}
      triggerLabel="Apagar"
      triggerVariant="ghost"
      title={`Apagar a ficha de ${clientName}?`}
      description="A ficha deixa de aparecer nas listas."
      confirmLabel="Apagar ficha"
      danger
      hidden={{ clientId }}
    >
      <div className="space-y-2 text-sm text-[var(--text-muted)]">
        <p>
          O histórico de {visitCount}{" "}
          {visitCount === 1 ? "atendimento" : "atendimentos"} fica guardado — é
          preciso para a contabilidade e para os relatórios.
        </p>
        <p>
          Se tiver conta de acesso ao portal, essa conta é apagada — a cliente
          pode voltar a criar conta com o mesmo e-mail depois.
        </p>
        <p>
          Se houver marcações por realizar, o sistema recusa e diz quantas são.
        </p>
      </div>
    </ConfirmAction>
  );
}

function ApproveSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? "A aprovar…" : "Aprovar acesso"}
    </Button>
  );
}

/**
 * Aprova uma conta de acesso criada pela própria cliente, quando ficou
 * pendente por ter sido preciso criar uma ficha nova (ver `registerClient`).
 */
export function ApproveAccountButton({ clientId }: { clientId: string }) {
  const [state, formAction] = useActionState<FormState, FormData>(
    approveClientAccountAction,
    {},
  );

  return (
    <form action={formAction}>
      <input type="hidden" name="clientId" value={clientId} />
      {state.error && (
        <p className="mb-2 text-sm text-[var(--danger)]">{state.error}</p>
      )}
      <ApproveSubmitButton />
    </form>
  );
}
