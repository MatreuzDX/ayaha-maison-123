"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Hint, Input, Label } from "@/components/ui/field";
import { changePasswordAction, type PasswordFormState } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "A alterar…" : "Alterar palavra-passe"}
    </Button>
  );
}

export function PasswordForm({ minLength }: { minLength: number }) {
  const [state, formAction] = useActionState<PasswordFormState, FormData>(
    changePasswordAction,
    {},
  );

  // Depois de mudar, todas as sessões fecham — incluindo esta. Em vez de
  // deixar a pessoa a clicar em coisas que já não funcionam, diz-se o que
  // aconteceu e manda-se entrar de novo.
  if (state.success) {
    return (
      <div className="rounded-[var(--radius)] border border-[var(--success)] bg-[var(--success-bg)] p-5">
        <p className="text-[var(--success)]">Palavra-passe alterada.</p>
        <p className="mt-2 text-sm text-[var(--text)]">
          Por segurança, todas as sessões foram fechadas — incluindo a deste
          dispositivo. Entre outra vez com a palavra-passe nova.
        </p>
        <Link
          href="/login"
          className="mt-4 inline-flex h-11 items-center rounded-[var(--radius)] bg-[var(--accent)] px-4 text-sm font-medium text-[var(--accent-fg)] hover:bg-[var(--accent-hover)]"
        >
          Entrar
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {state.error && (
        <div
          role="alert"
          className="rounded-[var(--radius)] border border-[var(--danger)] bg-[var(--danger-bg)] px-3 py-2.5 text-sm text-[var(--danger)]"
        >
          {state.error}
        </div>
      )}

      <div>
        <Label htmlFor="currentPassword" required>
          Palavra-passe atual
        </Label>
        <Input
          id="currentPassword"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="newPassword" required>
            Nova palavra-passe
          </Label>
          <Input
            id="newPassword"
            name="newPassword"
            type="password"
            autoComplete="new-password"
            required
          />
          <Hint>Pelo menos {minLength} caracteres.</Hint>
        </div>
        <div>
          <Label htmlFor="confirmPassword" required>
            Confirmar
          </Label>
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
          />
        </div>
      </div>

      <SubmitButton />
    </form>
  );
}
