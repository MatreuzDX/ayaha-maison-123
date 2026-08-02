"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { FieldError, Hint, Input, Label } from "@/components/ui/field";
import { completeProfileAction, type CompleteProfileState } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "A concluir…" : "Concluir registo"}
    </Button>
  );
}

export function CompleteProfileForm() {
  const [state, formAction] = useActionState<CompleteProfileState, FormData>(
    completeProfileAction,
    {},
  );

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
        <Label htmlFor="phone" required>
          Telefone
        </Label>
        <Input
          id="phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          placeholder="933 055 502"
          autoFocus
          required
          aria-invalid={Boolean(state.fieldErrors?.phone)}
          aria-describedby={
            state.fieldErrors?.phone ? "phone-error" : undefined
          }
        />
        <FieldError id="phone-error">{state.fieldErrors?.phone}</FieldError>
        <Hint>
          A Google não partilha o telefone — precisamos dele para marcações e
          contacto.
        </Hint>
      </div>

      <SubmitButton />
    </form>
  );
}
