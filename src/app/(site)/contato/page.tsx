import type { Metadata } from "next";
import { HomeServiceNote } from "@/components/site/HomeServiceNote";
import { WhatsappButton } from "@/components/site/WhatsappButton";
import { SITE, WA_MESSAGES } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Contacto",
  description:
    "Fale com a AYAHA MAISON pelo WhatsApp — agende o seu horário, tire dúvidas ou peça um orçamento.",
};

function Info({
  label,
  value,
  href,
}: {
  label: string;
  value: string;
  href?: string;
}) {
  return (
    <div>
      <dt className="text-gold-deep text-[0.65rem] tracking-[0.15em] uppercase">
        {label}
      </dt>
      <dd className="text-onyx/70 mt-1">
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-gold-deep transition"
          >
            {value}
          </a>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}

export default function ContatoPage() {
  return (
    <div className="container-luxe py-16 md:py-24">
      <div className="mb-14 text-center">
        <p className="eyebrow">Contacto</p>
        <h1 className="heading-serif text-onyx mt-3 text-4xl md:text-5xl">
          Fale com a Maison
        </h1>
        <div className="gold-divider mx-auto mt-6" />
      </div>

      <div className="mx-auto mb-14 grid max-w-4xl gap-4 sm:grid-cols-3">
        <WhatsappButton
          message={WA_MESSAGES.agendar}
          className="btn-gold justify-center"
        >
          Agendar pelo WhatsApp
        </WhatsappButton>
        <WhatsappButton
          message={WA_MESSAGES.duvidas}
          className="btn-outline justify-center"
        >
          Tirar dúvidas
        </WhatsappButton>
        <WhatsappButton
          message="Olá, AYAHA MAISON! Podem indicar-me um orçamento para atendimento a domicílio?"
          className="btn-outline justify-center"
        >
          Solicitar orçamento
        </WhatsappButton>
      </div>

      <div className="mx-auto mb-14 max-w-4xl">
        <HomeServiceNote />
      </div>

      <div className="mx-auto max-w-xl text-center">
        <h2 className="text-onyx font-serif text-2xl">Estamos à sua espera</h2>
        <p className="text-onyx/60 mt-4 leading-relaxed">
          O canal mais rápido é o WhatsApp. Tire dúvidas, peça orçamento ou
          agende o seu horário — respondemos com todo o carinho.
        </p>
        <dl className="mt-8 grid gap-5 text-sm sm:grid-cols-2">
          <Info label="Atendimento" value="A domicílio · na casa da cliente" />
          <Info
            label="Base / Região"
            value={`${SITE.baseArea} · ${SITE.serviceArea}`}
          />
          <Info label="Horário" value={SITE.hours} />
          <Info
            label="WhatsApp"
            value={SITE.whatsappDisplay}
            href={`https://wa.me/${SITE.whatsapp}`}
          />
          <Info
            label="E-mail"
            value={SITE.email}
            href={`mailto:${SITE.email}`}
          />
        </dl>
        <WhatsappButton message={WA_MESSAGES.agendar} className="btn-dark mt-8">
          Conversar no WhatsApp
        </WhatsappButton>
      </div>
    </div>
  );
}
