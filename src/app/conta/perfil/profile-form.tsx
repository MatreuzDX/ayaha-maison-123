"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { Client } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Hint, Input, Label } from "@/components/ui/field";
import { updateProfileAction, type ProfileFormState } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "A guardar…" : "Guardar alterações"}
    </Button>
  );
}

export function ProfileForm({ client }: { client: Client }) {
  const [state, formAction] = useActionState<ProfileFormState, FormData>(
    updateProfileAction,
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
      {state.success && (
        <div
          role="status"
          className="rounded-[var(--radius)] border border-[var(--success)] bg-[var(--success-bg)] px-3 py-2.5 text-sm text-[var(--success)]"
        >
          Dados guardados.
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
            defaultValue={client.firstName}
            required
          />
        </div>
        <div>
          <Label htmlFor="lastName">Apelido</Label>
          <Input
            id="lastName"
            name="lastName"
            defaultValue={client.lastName ?? ""}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="phone" required>
          Telefone
        </Label>
        <Input
          id="phone"
          name="phone"
          type="tel"
          defaultValue={client.phone}
          placeholder="933 055 502"
          required
        />
        <Hint>É o número que a equipa usa para vos contactar.</Hint>
      </div>

      <div>
        <Label htmlFor="addressLine">Rua e número</Label>
        <Input
          id="addressLine"
          name="addressLine"
          defaultValue={client.addressLine ?? ""}
          placeholder="Rua das Flores, 12"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor="addressExtra">Andar / porta</Label>
          <Input
            id="addressExtra"
            name="addressExtra"
            defaultValue={client.addressExtra ?? ""}
            placeholder="3.º Dto"
          />
        </div>
        <div>
          <Label htmlFor="postalCode">Código postal</Label>
          <Input
            id="postalCode"
            name="postalCode"
            defaultValue={client.postalCode ?? ""}
            placeholder="1500-123"
            inputMode="numeric"
          />
        </div>
        <div>
          <Label htmlFor="city">Localidade</Label>
          <Input id="city" name="city" defaultValue={client.city ?? "Lisboa"} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="accessNotes">Como entrar</Label>
          <Input
            id="accessNotes"
            name="accessNotes"
            defaultValue={client.accessNotes ?? ""}
            placeholder="Campainha 3B, porta verde"
          />
          <Hint>Ajuda a profissional a chegar sem perder tempo.</Hint>
        </div>
        <div>
          <Label htmlFor="parkingNotes">Estacionamento</Label>
          <Input
            id="parkingNotes"
            name="parkingNotes"
            defaultValue={client.parkingNotes ?? ""}
            placeholder="Lugar livre na rua de trás"
          />
        </div>
      </div>

      <SubmitButton />
    </form>
  );
}
