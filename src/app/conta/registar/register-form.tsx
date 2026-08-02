"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { FieldError, Hint, Input, Label } from "@/components/ui/field";
import { GoogleButton } from "@/components/auth/google-button";
import { registerClientAction, type RegisterState } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "A criar conta…" : "Criar conta"}
    </Button>
  );
}

export function RegisterForm() {
  const [state, formAction] = useActionState<RegisterState, FormData>(
    registerClientAction,
    {},
  );

  return (
    <div className="space-y-4">
      <GoogleButton />

      <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
        <span className="h-px flex-1 bg-[var(--border)]" />
        ou
        <span className="h-px flex-1 bg-[var(--border)]" />
      </div>

      <form action={formAction} className="space-y-4" noValidate>
        {state.error && (
          <div
            role="alert"
            className="rounded-[var(--radius)] border border-[var(--danger)] bg-[var(--danger-bg)] px-3 py-2.5 text-sm text-[var(--danger)]"
          >
            {state.error}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="firstName" required>
              Primeiro nome
            </Label>
            <Input
              id="firstName"
              name="firstName"
              autoComplete="given-name"
              autoFocus
              required
              aria-invalid={Boolean(state.fieldErrors?.firstName)}
              aria-describedby={
                state.fieldErrors?.firstName ? "firstName-error" : undefined
              }
            />
            <FieldError id="firstName-error">
              {state.fieldErrors?.firstName}
            </FieldError>
          </div>
          <div>
            <Label htmlFor="lastName">Apelido</Label>
            <Input id="lastName" name="lastName" autoComplete="family-name" />
          </div>
        </div>

        <div>
          <Label htmlFor="email" required>
            E-mail
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            aria-invalid={Boolean(state.fieldErrors?.email)}
            aria-describedby={
              state.fieldErrors?.email ? "email-error" : undefined
            }
          />
          <FieldError id="email-error">{state.fieldErrors?.email}</FieldError>
        </div>

        <div>
          <Label htmlFor="phone" required>
            Telefone
          </Label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            placeholder="933 055 502"
            required
            aria-invalid={Boolean(state.fieldErrors?.phone)}
            aria-describedby={
              state.fieldErrors?.phone ? "phone-error" : undefined
            }
          />
          <FieldError id="phone-error">{state.fieldErrors?.phone}</FieldError>
          <Hint>
            Se já for cliente da AYAHA MAISON, ligamos a conta à sua ficha
            existente.
          </Hint>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="password" required>
              Palavra-passe
            </Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
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
              aria-invalid={Boolean(state.fieldErrors?.confirmPassword)}
              aria-describedby={
                state.fieldErrors?.confirmPassword
                  ? "confirmPassword-error"
                  : undefined
              }
            />
            <FieldError id="confirmPassword-error">
              {state.fieldErrors?.confirmPassword}
            </FieldError>
          </div>
        </div>

        <SubmitButton />
      </form>
    </div>
  );
}
