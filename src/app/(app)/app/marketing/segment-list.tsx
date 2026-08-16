import Link from "next/link";
import { WhatsappIcon } from "@/components/site/WhatsappButton";
import { formatPhone, fullName, whatsappLink } from "@/lib/format";
import type { Segment, SegmentClient, SegmentKey } from "@/server/services/marketing.service";

/**
 * Mensagens por segmento.
 *
 * Ficam aqui, e não no serviço, pelo mesmo motivo que no painel de
 * retoques: são texto de interface, não regra de negócio. Estão escritas
 * na voz da fundadora a falar com a sua cliente — não em voz de empresa.
 *
 * Nenhuma promete desconto. Prometer desconto é decisão de quem gere o
 * preço, não de quem escreve o software; quem quiser oferecer alguma coisa
 * acrescenta-o na hora, antes de enviar.
 */
function mensagem(key: SegmentKey, c: SegmentClient): string {
  switch (key) {
    case "aniversariantes":
      return (
        `Olá ${c.firstName}! Fala a AYAHA MAISON. ` +
        `Passei só para lhe desejar um feliz aniversário 🎂 ` +
        `Que tenha um dia bonito — e se quiser vir buscar um olhar novo ` +
        `para festejar, é só dizer. 💛`
      );
    case "em-risco":
      return (
        `Olá ${c.firstName}! Fala a AYAHA MAISON. ` +
        `Notei que já não a vejo há algum tempo e lembrei-me de si. ` +
        `Se quiser voltar a marcar, tenho horários esta semana. 💛`
      );
    case "adormecidas":
      return (
        `Olá ${c.firstName}! Fala a AYAHA MAISON. ` +
        `Já passou algum tempo desde o seu último atendimento — ` +
        `se ainda fizer sentido para si, adorava voltar a cuidar do seu olhar. ` +
        `E se entretanto mudou de ideias, também está tudo bem. 💛`
      );
    case "primeira-visita":
      return (
        `Olá ${c.firstName}! Fala a AYAHA MAISON. ` +
        `Espero que tenha gostado do resultado do seu primeiro atendimento. ` +
        `Se gostou, adorava saber o que achou — e quando quiser voltar, ` +
        `é só dizer. 💛`
      );
  }
}

/** Detalhe secundário útil por segmento — a data, os dias, o que ajudar. */
function detalhe(key: SegmentKey, c: SegmentClient): string {
  if (key === "aniversariantes" && c.birthDate) {
    return `faz anos dia ${c.birthDate.getDate()}`;
  }
  if (c.daysSince === null) return "ainda não veio";
  return `há ${c.daysSince} dias`;
}

export function SegmentList({ segment }: { segment: Segment }) {
  const { clients, withoutConsent } = segment;

  return (
    <section className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-2)] p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg">
          {segment.title}
          {clients.length > 0 && (
            <span className="ml-2 text-sm text-[var(--text-muted)]">
              {clients.length}
            </span>
          )}
        </h2>
      </div>

      <p className="mt-1 max-w-2xl text-sm text-[var(--text-muted)]">
        {segment.description}
      </p>

      {clients.length === 0 ? (
        <p className="mt-4 rounded-[var(--radius)] border border-dashed border-[var(--border)] px-4 py-6 text-center text-sm text-[var(--text-muted)]">
          {withoutConsent > 0
            ? "Ninguém aqui com consentimento de marketing registado."
            : "Ninguém nesta situação — boa notícia."}
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-[var(--border)]">
          {clients.map((c) => {
            const nome = fullName(c.firstName, c.lastName);
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
                    {formatPhone(c.phone)} · {detalhe(segment.key, c)}
                    {c.visitCount > 0 &&
                      ` · ${c.visitCount} ${c.visitCount === 1 ? "visita" : "visitas"}`}
                  </p>
                </div>

                <a
                  href={whatsappLink(c.phone, mensagem(segment.key, c))}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={`Escrever a ${c.firstName} pelo WhatsApp`}
                  aria-label={`Escrever a ${nome} pelo WhatsApp`}
                  className="inline-flex h-9 items-center gap-2 rounded-full bg-[#25D366] px-3.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
                >
                  <WhatsappIcon className="h-4 w-4" />
                  Escrever
                </a>
              </li>
            );
          })}
        </ul>
      )}

      {withoutConsent > 0 && (
        <p className="mt-3 text-xs text-[var(--text-muted)]">
          Mais {withoutConsent}{" "}
          {withoutConsent === 1 ? "cliente está" : "clientes estão"} nesta
          situação, mas sem consentimento de marketing registado na ficha —
          por isso não {withoutConsent === 1 ? "aparece" : "aparecem"} aqui.
        </p>
      )}
    </section>
  );
}
