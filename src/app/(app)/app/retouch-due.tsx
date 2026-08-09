import Link from "next/link";
import { WhatsappIcon } from "@/components/site/WhatsappButton";
import { formatPhone, fullName, whatsappLink } from "@/lib/format";
import type { RetouchDue } from "@/server/services/client.service";

/**
 * Clientes na altura do retoque.
 *
 * Lista de trabalho, não envio automático: a equipa vê quem está na altura
 * e manda a mensagem com um clique, já escrita. É o hábito que mais vale
 * ao negócio — as extensões pedem manutenção a cada 2-3 semanas, e passado
 * esse tempo ou a cliente volta ou deixa de ser cliente.
 */
export function RetouchDue({ clients }: { clients: RetouchDue[] }) {
  if (clients.length === 0) return null;

  return (
    <section className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-2)] p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg">
          {clients.length === 1
            ? "1 cliente na altura do retoque"
            : `${clients.length} clientes na altura do retoque`}
        </h2>
        <p className="text-sm text-[var(--text-muted)]">
          Sem próxima marcação. Um clique manda a mensagem.
        </p>
      </div>

      <ul className="mt-3 divide-y divide-[var(--border)]">
        {clients.map((c) => {
          const nome = fullName(c.firstName, c.lastName);
          const mensagem =
            `Olá ${c.firstName}! Fala a AYAHA MAISON. ` +
            `Já passaram ${c.daysSince} dias desde o seu último atendimento` +
            (c.lastService ? ` (${c.lastService})` : "") +
            `, e é por volta desta altura que os cílios pedem manutenção. ` +
            `Quer que marquemos o retoque? 💛`;

          return (
            <li
              key={c.clientId}
              className="flex flex-wrap items-center justify-between gap-3 py-3"
            >
              <div className="min-w-0">
                <Link
                  href={`/app/clientes/${c.clientId}`}
                  className="font-medium hover:text-[var(--accent)] hover:underline"
                >
                  {nome}
                </Link>
                <p className="tabular mt-0.5 text-xs text-[var(--text-muted)]">
                  {formatPhone(c.phone)} · há {c.daysSince} dias
                  {c.lastService && ` · ${c.lastService}`}
                </p>
              </div>

              <a
                href={whatsappLink(c.phone, mensagem)}
                target="_blank"
                rel="noopener noreferrer"
                title={`Lembrar ${c.firstName} pelo WhatsApp`}
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
