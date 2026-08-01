"use client";

import { ConfirmAction } from "@/components/ui/confirm";
import { deleteClientAction } from "./actions";

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
          Se houver marcações por realizar, o sistema recusa e diz quantas são.
        </p>
      </div>
    </ConfirmAction>
  );
}
