"use client";

import { Input, Label } from "@/components/ui/field";
import { ConfirmAction } from "@/components/ui/confirm";
import { formatEUR } from "@/lib/money";
import {
  cancelAppointmentAction,
  completeAppointmentAction,
} from "./actions";

/**
 * Botões de fecho de um atendimento.
 *
 * Concluir e cancelar são ambos difíceis de reverter — concluir dá o carimbo
 * de fidelidade e abate material; cancelar conta como cancelamento no
 * histórico da cliente. Por isso os dois passam por confirmação.
 */
export function AppointmentActions({
  appointmentId,
  clientName,
  totalCents,
  when,
  canComplete,
  canCancel,
}: {
  appointmentId: string;
  clientName: string;
  totalCents: number;
  when: string;
  canComplete: boolean;
  canCancel: boolean;
}) {
  return (
    <span className="flex gap-1.5">
      {canComplete && (
        <ConfirmAction
          action={completeAppointmentAction}
          triggerLabel="Concluir"
          triggerVariant="primary"
          title="Concluir atendimento"
          description={`${clientName} — ${when}`}
          confirmLabel="Concluir"
          hidden={{ appointmentId }}
        >
          <p className="text-sm text-[var(--text-muted)]">
            Vai registar {formatEUR(totalCents)} na conta da cliente, dar o
            carimbo de fidelidade e abater o material usado.
          </p>
        </ConfirmAction>
      )}

      {canCancel && (
        <ConfirmAction
          action={cancelAppointmentAction}
          triggerLabel="Cancelar"
          triggerVariant="ghost"
          title="Cancelar marcação"
          description={`${clientName} — ${when}`}
          confirmLabel="Cancelar marcação"
          danger
          hidden={{ appointmentId }}
        >
          <div>
            <Label htmlFor={`reason-${appointmentId}`} required>
              Motivo
            </Label>
            <Input
              id={`reason-${appointmentId}`}
              name="reason"
              required
              autoFocus
              placeholder="A cliente adoeceu"
            />
            {/* O motivo fica no histórico da cliente. Sem ele, daqui a três
                meses ninguém sabe se foi ela que desmarcou ou nós. */}
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              Fica registado no histórico da cliente.
            </p>
          </div>
        </ConfirmAction>
      )}
    </span>
  );
}
