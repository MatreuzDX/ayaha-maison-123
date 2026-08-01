import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getActor } from "@/server/auth";
import { getClientSession } from "@/server/client-auth";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = { title: "Criar conta" };

export default async function RegistarPage() {
  // Já autenticada de alguma forma? Não faz sentido mostrar o registo.
  if (await getActor()) redirect("/app");
  if (await getClientSession()) redirect("/conta");

  return (
    <div className="mx-auto max-w-md space-y-5">
      <div className="text-center">
        <h1 className="font-[family-name:var(--font-cormorant)] text-3xl text-[var(--text)]">
          Criar conta
        </h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Acompanhe as suas marcações e o cartão AYAHA Club.
        </p>
      </div>

      <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-2)] p-6 shadow-sm">
        <RegisterForm />
      </div>

      <p className="text-center text-sm text-[var(--text-muted)]">
        Já tem conta?{" "}
        <Link href="/login" className="text-[var(--accent)] hover:underline">
          Entrar
        </Link>
      </p>
    </div>
  );
}
