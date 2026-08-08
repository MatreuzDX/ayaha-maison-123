"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { ConfirmAction } from "@/components/ui/confirm";
import { Hint, Input, Label } from "@/components/ui/field";
import {
  approveClientAccountAction,
  deleteClientAction,
  revokeClientAccessAction,
  setClientPasswordAction,
  updateClientEmailAction,
} from "./actions";
import type { AccountFormState, FormState } from "./actions";

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

// ── Gestão do acesso ao portal ───────────────────────────────

function SmallSubmit({ label, busy }: { label: string; busy: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" variant="secondary" disabled={pending}>
      {pending ? busy : label}
    </Button>
  );
}

function Feedback({ state }: { state: AccountFormState }) {
  if (state.error) {
    return <p className="text-sm text-[var(--danger)]">{state.error}</p>;
  }
  if (state.success) {
    return <p className="text-sm text-[var(--success)]">{state.success}</p>;
  }
  return null;
}

/** Corrigir o e-mail com que a cliente entra. */
export function ChangeClientEmailForm({
  clientId,
  currentEmail,
}: {
  clientId: string;
  currentEmail: string;
}) {
  const [state, formAction] = useActionState<AccountFormState, FormData>(
    updateClientEmailAction,
    {},
  );

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="clientId" value={clientId} />
      <Label htmlFor={`email-${clientId}`}>E-mail de acesso</Label>
      <Input
        id={`email-${clientId}`}
        name="email"
        type="email"
        defaultValue={currentEmail}
        required
      />
      <Feedback state={state} />
      <SmallSubmit label="Alterar e-mail" busy="A alterar…" />
    </form>
  );
}

/**
 * Definir uma palavra-passe nova.
 *
 * A cliente liga a dizer que não consegue entrar, combina-se uma
 * palavra-passe, escreve-se aqui. Não existe forma de ver a que ela tinha —
 * só fica guardado um hash, que não se desfaz.
 */
export function SetClientPasswordForm({
  clientId,
  minLength,
}: {
  clientId: string;
  minLength: number;
}) {
  const [state, formAction] = useActionState<AccountFormState, FormData>(
    setClientPasswordAction,
    {},
  );

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="clientId" value={clientId} />
      <Label htmlFor={`password-${clientId}`}>Definir palavra-passe nova</Label>
      <Input
        id={`password-${clientId}`}
        name="password"
        type="text"
        autoComplete="off"
        placeholder={`Mínimo ${minLength} caracteres`}
        required
      />
      <Hint>
        Fecha as sessões abertas. Combine-a com a cliente e diga-lha — depois de
        guardada, ninguém a consegue ver.
      </Hint>
      <Feedback state={state} />
      <SmallSubmit label="Guardar palavra-passe" busy="A guardar…" />
    </form>
  );
}

/** Cortar o acesso: tira palavra-passe, desliga o Google, fecha sessões. */
export function RevokeAccessButton({
  clientId,
  clientName,
}: {
  clientId: string;
  clientName: string;
}) {
  return (
    <ConfirmAction
      action={revokeClientAccessAction}
      triggerLabel="Remover acesso"
      triggerVariant="ghost"
      title={`Remover o acesso de ${clientName}?`}
      description="A ficha e o histórico ficam — só o acesso ao portal é cortado."
      confirmLabel="Remover acesso"
      danger
      hidden={{ clientId }}
    >
      <div className="space-y-2 text-sm text-[var(--text-muted)]">
        <p>
          Fica sem palavra-passe e sem entrada pelo Google, e as sessões abertas
          fecham-se.
        </p>
        <p>
          Se mudar de ideias, basta definir uma palavra-passe nova aqui na ficha
          — não é preciso a cliente registar-se outra vez.
        </p>
      </div>
    </ConfirmAction>
  );
}
