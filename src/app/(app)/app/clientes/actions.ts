"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { AcquisitionSource, ClientStatus } from "@prisma/client";
import { requireActor } from "@/server/auth";
import { AppError } from "@/server/errors";
import {
  approveClientAccount,
  createClient,
  deleteClient,
  revokeClientAccountAccess,
  setClientAccountPassword,
  updateClient,
  updateClientAccountEmail,
} from "@/server/services/client.service";

/**
 * Server Actions dos clientes.
 *
 * Responsabilidade destas funções: ler o FormData, converter tipos e traduzir
 * erros para o formato que o formulário sabe mostrar. Toda a validação de
 * negócio e as permissões estão no serviço — aqui não se decide nada.
 */

export interface FormState {
  error?: string;
  fieldErrors?: Record<string, string>;
}

function text(form: FormData, key: string): string | undefined {
  const value = form.get(key);
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

function readClientInput(form: FormData) {
  return {
    firstName: text(form, "firstName") ?? "",
    lastName: text(form, "lastName") ?? null,
    phone: text(form, "phone") ?? "",
    email: text(form, "email") ?? null,
    addressLine: text(form, "addressLine") ?? null,
    addressExtra: text(form, "addressExtra") ?? null,
    postalCode: text(form, "postalCode") ?? null,
    city: text(form, "city") ?? null,
    accessNotes: text(form, "accessNotes") ?? null,
    parkingNotes: text(form, "parkingNotes") ?? null,
    notes: text(form, "notes") ?? null,
    status: text(form, "status") as ClientStatus | undefined,
    source: (text(form, "source") as AcquisitionSource | undefined) ?? null,
    marketingOptIn: form.get("marketingOptIn") === "on",
  };
}

export async function createClientAction(
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  let clientId: string;

  try {
    const actor = await requireActor();
    const created = await createClient(actor, readClientInput(form));
    clientId = created.id;
  } catch (err) {
    if (err instanceof AppError) return { error: err.message };
    console.error("[createClient]", err);
    return { error: "Não foi possível criar a ficha. Tente novamente." };
  }

  revalidatePath("/app/clientes");
  // `redirect` atira internamente — tem de ficar fora do try/catch.
  redirect(`/app/clientes/${clientId}`);
}

export async function updateClientAction(
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const clientId = form.get("clientId");
  if (typeof clientId !== "string") {
    return { error: "Ficha não identificada." };
  }

  try {
    const actor = await requireActor();
    await updateClient(actor, clientId, readClientInput(form));
  } catch (err) {
    if (err instanceof AppError) return { error: err.message };
    console.error("[updateClient]", err);
    return { error: "Não foi possível guardar as alterações." };
  }

  revalidatePath(`/app/clientes/${clientId}`);
  revalidatePath("/app/clientes");
  redirect(`/app/clientes/${clientId}`);
}

export async function deleteClientAction(
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const clientId = form.get("clientId");
  if (typeof clientId !== "string") {
    return { error: "Ficha não identificada." };
  }

  try {
    const actor = await requireActor();
    await deleteClient(actor, clientId);
  } catch (err) {
    if (err instanceof AppError) return { error: err.message };
    console.error("[deleteClient]", err);
    return { error: "Não foi possível apagar a ficha." };
  }

  revalidatePath("/app/clientes");
  redirect("/app/clientes");
}

export async function approveClientAccountAction(
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const clientId = form.get("clientId");
  if (typeof clientId !== "string") {
    return { error: "Ficha não identificada." };
  }

  try {
    const actor = await requireActor();
    await approveClientAccount(actor, clientId);
  } catch (err) {
    if (err instanceof AppError) return { error: err.message };
    console.error("[approveClientAccount]", err);
    return { error: "Não foi possível aprovar o acesso." };
  }

  revalidatePath(`/app/clientes/${clientId}`);
  return {};
}

// ── Gestão do acesso da cliente ao portal ────────────────────

export interface AccountFormState {
  error?: string;
  success?: string;
}

export async function updateClientEmailAction(
  _prev: AccountFormState,
  form: FormData,
): Promise<AccountFormState> {
  const clientId = form.get("clientId");
  const email = form.get("email");
  if (typeof clientId !== "string") return { error: "Ficha não identificada." };
  if (typeof email !== "string" || !email.trim()) {
    return { error: "Indique o novo e-mail." };
  }

  try {
    const actor = await requireActor();
    await updateClientAccountEmail(actor, clientId, email);
  } catch (err) {
    if (err instanceof AppError) return { error: err.message };
    console.error("[updateClientAccountEmail]", err);
    return { error: "Não foi possível alterar o e-mail." };
  }

  revalidatePath(`/app/clientes/${clientId}`);
  return { success: "E-mail alterado." };
}

export async function setClientPasswordAction(
  _prev: AccountFormState,
  form: FormData,
): Promise<AccountFormState> {
  const clientId = form.get("clientId");
  const password = form.get("password");
  if (typeof clientId !== "string") return { error: "Ficha não identificada." };
  if (typeof password !== "string" || !password) {
    return { error: "Indique a nova palavra-passe." };
  }

  try {
    const actor = await requireActor();
    await setClientAccountPassword(actor, clientId, password);
  } catch (err) {
    if (err instanceof AppError) return { error: err.message };
    console.error("[setClientAccountPassword]", err);
    return { error: "Não foi possível definir a palavra-passe." };
  }

  revalidatePath(`/app/clientes/${clientId}`);
  return {
    success:
      "Palavra-passe definida. Diga-a à cliente — a partir de agora é com ela que entra.",
  };
}

export async function revokeClientAccessAction(
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const clientId = form.get("clientId");
  if (typeof clientId !== "string") return { error: "Ficha não identificada." };

  try {
    const actor = await requireActor();
    await revokeClientAccountAccess(actor, clientId);
  } catch (err) {
    if (err instanceof AppError) return { error: err.message };
    console.error("[revokeClientAccountAccess]", err);
    return { error: "Não foi possível remover o acesso." };
  }

  revalidatePath(`/app/clientes/${clientId}`);
  return {};
}
