import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requireActorPage } from "@/server/auth";
import { can } from "@/server/permissions";
import { getClient } from "@/server/services/client.service";
import { NotFoundError } from "@/server/errors";
import { PageHeader } from "@/components/ui/page";
import { fullName } from "@/lib/format";
import { updateClientAction } from "../../actions";
import { ClientForm } from "../../client-form";

export const metadata: Metadata = { title: "Editar cliente" };

export default async function EditarClientePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await requireActorPage();
  if (!can(actor, "client:update")) redirect("/clientes");

  const { id } = await params;

  let client;
  try {
    client = await getClient(actor, id);
  } catch (err) {
    if (err instanceof NotFoundError) notFound();
    throw err;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader title={fullName(client.firstName, client.lastName)} subtitle="Editar ficha" />
      <ClientForm
        action={updateClientAction}
        client={client}
        submitLabel="Guardar alterações"
      />
    </div>
  );
}
