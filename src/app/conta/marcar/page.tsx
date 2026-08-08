import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getClientSession } from "@/server/client-auth";
import {
  BOOKING_HORIZON_DAYS,
  listBookableServices,
} from "@/server/client-booking";
import { BookingWizard } from "./booking-wizard";

export const metadata: Metadata = { title: "Marcar atendimento" };

// A disponibilidade muda a cada marcação — nunca servir isto de cache.
export const dynamic = "force-dynamic";

export default async function MarcarPage() {
  const session = await getClientSession();
  if (!session) redirect("/login?proximo=%2Fconta%2Fmarcar");

  // Conta ainda por aprovar: mostra porquê em vez de um formulário que
  // ia recusar no fim, depois de a pessoa escolher tudo.
  if (!session.approved) {
    return (
      <div className="space-y-4">
        <h1 className="font-[family-name:var(--font-cormorant)] text-3xl text-[var(--text)]">
          Marcar atendimento
        </h1>
        <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-2)] p-6">
          <p className="text-[var(--text)]">
            A sua conta está a aguardar aprovação da equipa AYAHA MAISON.
          </p>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            Assim que a equipa confirmar, pode marcar aqui. Se for urgente, fale
            connosco pelo WhatsApp.
          </p>
          <Link
            href="/conta"
            className="mt-4 inline-block text-sm text-[var(--text-muted)] underline hover:text-[var(--text)]"
          >
            Voltar à minha conta
          </Link>
        </div>
      </div>
    );
  }

  const services = await listBookableServices(session.unitId);

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
          Marcar atendimento
        </h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Escolha o serviço, a profissional e a hora. Fica registado como pedido
          — a equipa confirma consigo.
        </p>
      </div>

      <BookingWizard
        services={services}
        horizonDays={BOOKING_HORIZON_DAYS}
        clientFirstName={session.name}
      />
    </div>
  );
}
