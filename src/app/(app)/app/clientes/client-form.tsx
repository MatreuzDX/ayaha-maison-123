"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import type { Client } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Hint, Input, Label } from "@/components/ui/field";
import { Card } from "@/components/ui/page";
import type { FormState } from "./actions";

const STATUS_OPTIONS = [
  { value: "LEAD", label: "Contacto — ainda não veio" },
  { value: "ACTIVE", label: "Ativa" },
  { value: "AT_RISK", label: "Em risco" },
  { value: "DORMANT", label: "Adormecida" },
  { value: "BLOCKED", label: "Bloqueada" },
];

const SOURCE_OPTIONS = [
  { value: "INSTAGRAM", label: "Instagram" },
  { value: "WHATSAPP", label: "WhatsApp" },
  { value: "REFERRAL", label: "Indicação de outra cliente" },
  { value: "GOOGLE", label: "Google" },
  { value: "WEBSITE", label: "Site" },
  { value: "WALK_BY", label: "Passou à porta" },
  { value: "OTHER", label: "Outro" },
];

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "A guardar…" : label}
    </Button>
  );
}

function Select({
  id,
  name,
  defaultValue,
  options,
  placeholder,
}: {
  id: string;
  name: string;
  defaultValue?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}) {
  return (
    <select
      id={id}
      name={name}
      defaultValue={defaultValue ?? ""}
      className="h-11 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-2)] px-3 text-sm text-[var(--text)] focus:border-[var(--accent)] focus:outline-none"
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

export function ClientForm({
  action,
  client,
  submitLabel,
}: {
  action: (prev: FormState, form: FormData) => Promise<FormState>;
  client?: Client;
  submitLabel: string;
}) {
  const [state, formAction] = useActionState<FormState, FormData>(action, {});

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {client && <input type="hidden" name="clientId" value={client.id} />}

      {state.error && (
        <div
          role="alert"
          className="rounded-[var(--radius)] border border-[var(--danger)] bg-[var(--danger-bg)] px-3 py-2.5 text-sm text-[var(--danger)]"
        >
          {state.error}
        </div>
      )}

      <Card className="space-y-4">
        <h2 className="text-lg">Identificação</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="firstName" required>
              Primeiro nome
            </Label>
            <Input
              id="firstName"
              name="firstName"
              defaultValue={client?.firstName}
              autoFocus={!client}
              required
            />
          </div>
          <div>
            <Label htmlFor="lastName">Apelido</Label>
            <Input
              id="lastName"
              name="lastName"
              defaultValue={client?.lastName ?? ""}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="phone" required>
              Telefone
            </Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              inputMode="tel"
              defaultValue={client?.phone ?? ""}
              placeholder="933 055 502"
              required
            />
            <Hint>Aceita formato português ou internacional.</Hint>
          </div>
          <div>
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              name="email"
              type="email"
              defaultValue={client?.email ?? ""}
            />
          </div>
        </div>
      </Card>

      <Card className="space-y-4">
        <div>
          <h2 className="text-lg">Morada</h2>
          <p className="mt-0.5 text-sm text-[var(--text-muted)]">
            O código postal define a zona de deslocação e a respetiva taxa.
          </p>
        </div>

        <div>
          <Label htmlFor="addressLine">Rua e número</Label>
          <Input
            id="addressLine"
            name="addressLine"
            defaultValue={client?.addressLine ?? ""}
            placeholder="Rua das Flores, 12"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <Label htmlFor="addressExtra">Andar / porta</Label>
            <Input
              id="addressExtra"
              name="addressExtra"
              defaultValue={client?.addressExtra ?? ""}
              placeholder="3.º Dto"
            />
          </div>
          <div>
            <Label htmlFor="postalCode">Código postal</Label>
            <Input
              id="postalCode"
              name="postalCode"
              defaultValue={client?.postalCode ?? ""}
              placeholder="1500-123"
              inputMode="numeric"
            />
          </div>
          <div>
            <Label htmlFor="city">Localidade</Label>
            <Input
              id="city"
              name="city"
              defaultValue={client?.city ?? "Lisboa"}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="accessNotes">Como entrar</Label>
            <Input
              id="accessNotes"
              name="accessNotes"
              defaultValue={client?.accessNotes ?? ""}
              placeholder="Campainha 3B, porta verde"
            />
          </div>
          <div>
            <Label htmlFor="parkingNotes">Estacionamento</Label>
            <Input
              id="parkingNotes"
              name="parkingNotes"
              defaultValue={client?.parkingNotes ?? ""}
              placeholder="Lugar livre na rua de trás"
            />
          </div>
        </div>
      </Card>

      <Card className="space-y-4">
        <h2 className="text-lg">Acompanhamento</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="status">Estado</Label>
            <Select
              id="status"
              name="status"
              defaultValue={client?.status ?? "LEAD"}
              options={STATUS_OPTIONS}
            />
          </div>
          <div>
            <Label htmlFor="source">Como chegou até nós</Label>
            <Select
              id="source"
              name="source"
              defaultValue={client?.source ?? ""}
              options={SOURCE_OPTIONS}
              placeholder="Não sei"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="notes">Notas internas</Label>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            defaultValue={client?.notes ?? ""}
            placeholder="Preferências, sensibilidades, o que correu bem da última vez…"
            className="w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--text-subtle)] focus:border-[var(--accent)] focus:outline-none"
          />
          <Hint>Só a equipa vê estas notas.</Hint>
        </div>

        <div className="flex items-start gap-2.5">
          <input
            id="marketingOptIn"
            name="marketingOptIn"
            type="checkbox"
            defaultChecked={client?.marketingOptIn ?? false}
            className="mt-0.5 size-4 accent-[var(--accent)]"
          />
          <label htmlFor="marketingOptIn" className="text-sm">
            Autoriza receber campanhas e promoções
            <span className="mt-0.5 block text-xs text-[var(--text-muted)]">
              Sem esta autorização não é possível incluí-la em envios de
              marketing (RGPD).
            </span>
          </label>
        </div>
      </Card>

      <div className="flex gap-2">
        <SubmitButton label={submitLabel} />
        <Link href={client ? `/app/clientes/${client.id}` : "/app/clientes"}>
          <Button type="button" variant="secondary">
            Cancelar
          </Button>
        </Link>
      </div>
    </form>
  );
}
