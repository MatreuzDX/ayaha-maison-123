import type { Metadata } from "next";
import Link from "next/link";
import { requireClientPage } from "@/server/client-auth";
import { prisma } from "@/server/db";
import { ProfileForm } from "./profile-form";

export const metadata: Metadata = { title: "O meu perfil" };

export default async function PerfilPage() {
  const session = await requireClientPage();
  const client = await prisma.client.findUniqueOrThrow({
    where: { id: session.clientId },
  });

  return (
    <div className="space-y-5">
      <div>
        <Link
          href="/conta"
          className="text-sm text-[var(--text-muted)] hover:text-[var(--text)]"
        >
          ← A minha conta
        </Link>
        <h1 className="mt-2 font-[family-name:var(--font-cormorant)] text-3xl text-[var(--text)]">
          O meu perfil
        </h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Mantenha o seu contacto e morada atualizados — é o que a profissional
          usa para chegar a sua casa.
        </p>
      </div>

      <ProfileForm client={client} />
    </div>
  );
}
