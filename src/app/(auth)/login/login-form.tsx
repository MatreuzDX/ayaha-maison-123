"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label } from "@/components/ui/field";
import { loginAction, type LoginState } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "A entrar…" : "Entrar"}
    </Button>
  );
}

export function LoginForm({ proximo }: { proximo?: string }) {
  const [state, formAction] = useActionState<LoginState, FormData>(
    loginAction,
    {},
  );

  return (
    <div className="space-y-4">
      <form action={formAction} className="space-y-4" noValidate>
        {proximo && <input type="hidden" name="proximo" value={proximo} />}

        {state.error && (
          <div
            role="alert"
            className="rounded-[var(--radius)] border border-[var(--danger)] bg-[var(--danger-bg)] px-3 py-2.5 text-sm text-[var(--danger)]"
          >
            {state.error}
          </div>
        )}

        <div>
          <Label htmlFor="email" required>
            E-mail
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            defaultValue={state.email ?? ""}
            autoComplete="username"
            autoFocus
            required
            aria-invalid={Boolean(state.fieldErrors?.email)}
            aria-describedby={
              state.fieldErrors?.email ? "email-error" : undefined
            }
          />
          <FieldError id="email-error">{state.fieldErrors?.email}</FieldError>
        </div>

        <div>
          <Label htmlFor="password" required>
            Palavra-passe
          </Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            aria-invalid={Boolean(state.fieldErrors?.password)}
            aria-describedby={
              state.fieldErrors?.password ? "password-error" : undefined
            }
          />
          <FieldError id="password-error">
            {state.fieldErrors?.password}
          </FieldError>
        </div>

        <SubmitButton />
      </form>
    </div>
  );
}
