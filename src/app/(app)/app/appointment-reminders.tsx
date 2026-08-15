import Link from "next/link";
import { WhatsappIcon } from "@/components/site/WhatsappButton";
import { formatPhone, fullName, whatsappLink } from "@/lib/format";
import { formatTime } from "@/lib/datetime";
import {
  REMINDER_WINDOW_LABEL,
  type AppointmentReminder,
} from "@/server/services/appointment.service";

/**
 * Marcações a lembrar — 48h, 24h ou 2h antes.
 *
 * Lista de trabalho, não envio automático: a mesma filosofia do painel de
 * retoques. A equipa vê quem se aproxima e manda a mensagem já escrita, com
 * um clique. Faltas custam tempo de deslocação perdido — este painel é o
 * que mais reduz isso.
 */
export function AppointmentReminders({
  reminders,
}: {
  reminders: AppointmentReminder[];
}) {
  if (reminders.length === 0) return null;

  return (
    <section className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-2)] p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg">
          {reminders.length === 1
            ? "1 marcação a lembrar"
            : `${reminders.length} marcações a lembrar`}
        </h2>
        <p className="text-sm text-[var(--text-muted)]">
          48h, 24h ou 2h antes. Um clique manda a mensagem.
        </p>
      </div>

      <ul className="mt-3 divide-y divide-[var(--border)]">
        {reminders.map((r) => {
          const nome = fullName(r.firstName, r.lastName);
          const servicos = r.services.join(", ") || "atendimento";
          const mensagem =
            `Olá ${r.firstName}! Fala a AYAHA MAISON. ` +
            `Só a confirmar o seu atendimento de ${servicos} ` +
            `${REMINDER_WINDOW_LABEL[r.window]}, às ${formatTime(r.startAt)}. ` +
            `Até já! 💛`;

          return (
            <li
              key={r.appointmentId}
              className="flex flex-wrap items-center justify-between gap-3 py-3"
            >
              <div className="min-w-0">
                <Link
                  href={`/app/clientes/${r.clientId}`}
                  className="font-medium hover:text-[var(--accent)] hover:underline"
                >
                  {nome}
                </Link>
                <p className="tabular mt-0.5 text-xs text-[var(--text-muted)]">
                  {formatPhone(r.phone)} · {REMINDER_WINDOW_LABEL[r.window]} às{" "}
                  {formatTime(r.startAt)} · {r.professionalName}
                </p>
              </div>

              <a
                href={whatsappLink(r.phone, mensagem)}
                target="_blank"
                rel="noopener noreferrer"
                title={`Lembrar ${r.firstName} pelo WhatsApp`}
                aria-label={`Lembrar ${nome} pelo WhatsApp`}
                className="inline-flex h-9 items-center gap-2 rounded-full bg-[#25D366] px-3.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
              >
                <WhatsappIcon className="h-4 w-4" />
                Lembrar
              </a>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
