import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyPendingSignup } from "@/lib/google-oauth";
import { CompleteProfileForm } from "./complete-profile-form";

export const metadata: Metadata = { title: "Concluir registo" };

const PENDING_COOKIE = "ayaha_google_pending";

/**
 * Último passo do registo por Google — só chega aqui quem tem o cookie
 * assinado que o callback deixou. Sem ele (link visitado diretamente, cookie
 * expirado ao fim de 10 min) não há perfil para completar.
 */
export default async function CompletarPerfilPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(PENDING_COOKIE)?.value;
  const pending = token ? verifyPendingSignup(token) : null;

  if (!pending) redirect("/login");

  return (
    <div className="mx-auto max-w-md space-y-5">
      <div className="text-center">
        <h1 className="font-[family-name:var(--font-cormorant)] text-3xl text-[var(--text)]">
          Quase lá, {pending.firstName}
        </h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Confirme o seu telefone para concluir a conta ligada a {pending.email}
          .
        </p>
      </div>

      <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-2)] p-6 shadow-sm">
        <CompleteProfileForm />
      </div>
    </div>
  );
}
