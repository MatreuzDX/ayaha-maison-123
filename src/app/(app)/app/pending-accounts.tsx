"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ConfirmAction } from "@/components/ui/confirm";
import { formatPhone, fullName } from "@/lib/format";
import {
  approveClientAccountAction,
  refuseClientAccountAction,
  type FormState,
} from "./clientes/actions";

export interface PendingAccount {
  clientId: string;
  firstName: string;
  lastName: string | null;
  phone: string;
  email: string;
  requestedAt: Date;
}

function ApproveButton({ clientId }: { clientId: string }) {
  const [state, formAction] = useActionState<FormState, FormData>(
    approveClientAccountAction,
    {},
  );

  return (
    <form action={formAction} className="inline">
      <input type="hidden" name="clientId" value={clientId} />
      {state.error && (
        <span className="mr-2 text-xs text-[var(--danger)]">{state.error}</span>
      )}
      <ApproveSubmit />
    </form>
  );
}

function ApproveSubmit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? "A aprovar…" : "Aprovar"}
    </Button>
  );
}

/**
 * Pedidos de acesso ainda por decidir.
 *
 * Fica no início do CRM de propósito: antes disto, a equipa só descobria um
 * pedido se por acaso abrisse a ficha da pessoa, e quem se registou ficava à
 * espera sem ninguém saber.
 */
export function PendingAccounts({ accounts }: { accounts: PendingAccount[] }) {
  if (accounts.length === 0) return null;

  return (
    <section className="rounded-[var(--radius)] border border-[var(--warning)] bg-[var(--warning-bg)] p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg text-[var(--text)]">
          {accounts.length === 1
            ? "1 pedido de acesso"
            : `${accounts.length} pedidos de acesso`}
        </h2>
        <p className="text-sm text-[var(--text-muted)]">
          Estas pessoas criaram conta no site e estão à espera.
        </p>
      </div>

      <ul className="mt-3 divide-y divide-[var(--border)]">
        {accounts.map((a) => {
          const nome = fullName(a.firstName, a.lastName);
          return (
            <li
              key={a.clientId}
              className="flex flex-wrap items-center justify-between gap-3 py-3"
            >
              <div className="min-w-0">
                <Link
                  href={`/app/clientes/${a.clientId}`}
                  className="font-medium hover:text-[var(--accent)] hover:underline"
                >
                  {nome}
                </Link>
                <p className="tabular mt-0.5 text-xs text-[var(--text-muted)]">
                  {formatPhone(a.phone)} · {a.email}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <ApproveButton clientId={a.clientId} />
                <ConfirmAction
                  action={refuseClientAccountAction}
                  triggerLabel="Recusar"
                  triggerVariant="ghost"
                  title={`Recusar o acesso de ${nome}?`}
                  description="A ficha fica na lista de clientes; só o acesso ao site é recusado."
                  confirmLabel="Recusar pedido"
                  danger
                  hidden={{ clientId: a.clientId }}
                >
                  <p className="text-sm text-[var(--text-muted)]">
                    A conta de acesso é apagada e o e-mail fica livre — se for
                    engano, a pessoa pode voltar a registar-se com o mesmo
                    e-mail.
                  </p>
                </ConfirmAction>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
