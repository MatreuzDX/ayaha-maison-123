import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireActorPage } from "@/server/auth";
import { can } from "@/server/permissions";
import { PageHeader } from "@/components/ui/page";
import { createClientAction } from "../actions";
import { ClientForm } from "../client-form";

export const metadata: Metadata = { title: "Nova cliente" };

export default async function NovaClientePage() {
  const actor = await requireActorPage();
  if (!can(actor, "client:create")) redirect("/clientes");

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader
        title="Nova cliente"
        subtitle="Só o nome e o telefone são obrigatórios — o resto pode ficar para depois."
      />
      <ClientForm action={createClientAction} submitLabel="Criar ficha" />
    </div>
  );
}
