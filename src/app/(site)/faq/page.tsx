import type { Metadata } from "next";
import { PageHero } from "@/components/site/PageHero";
import { HomeServiceNote } from "@/components/site/HomeServiceNote";
import { WhatsappButton } from "@/components/site/WhatsappButton";
import { WA_MESSAGES, SITE } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Perguntas Frequentes",
  description:
    "Dúvidas sobre o atendimento da AYAHA MAISON, em Benfica, Lisboa: no espaço ou a domicílio — como funciona, horários, região e deslocamento.",
};

const FAQS = [
  {
    q: "O atendimento é onde?",
    a: `Tem duas opções: no nosso espaço, na ${SITE.studio.full}, ou a domicílio, na sua casa — nesse caso levamos toda a estrutura e produtos até si.`,
  },
  {
    q: "Que regiões atendem a domicílio?",
    a: "Cobrimos principalmente Lisboa e arredores, com base em Benfica. Se tiver dúvidas sobre a sua zona, fale connosco pelo WhatsApp.",
  },
  {
    q: "Como marco um horário?",
    a: "O atendimento é mediante agendamento, feito pelo WhatsApp. Confirmamos data e horário de acordo com a disponibilidade.",
  },
  {
    q: "O deslocamento tem custo?",
    a: "Só ao domicílio — poderá ter um custo adicional dependendo da distância, informado antes de confirmar o agendamento. No nosso espaço não há custo de deslocamento.",
  },
  {
    q: "Que serviços oferecem?",
    a: "Trabalhamos exclusivamente com extensão de cílios: fio a fio, volume brasileiro, volume russo, fox eyes, efeito gatinho e efeito esquilo.",
  },
  {
    q: "Quanto tempo dura a aplicação?",
    a: "Depende da técnica: em média entre 90 e 120 minutos. Informamos a duração estimada no agendamento.",
  },
  {
    q: "Preciso de alguma preparação antes?",
    a: "Venha com os cílios limpos, sem maquilhagem nos olhos e sem lentes de contacto. Se for a domicílio, reserve um espaço tranquilo e com uma tomada por perto para a aplicação.",
  },
  {
    q: "Como funciona o programa de fidelidade?",
    a: "A cada 5 atendimentos, ganha um carimbo completo no AYAHA Club e escolhe uma recompensa. Acompanhe tudo na sua Área do Cliente.",
  },
];

export default function FaqPage() {
  return (
    <>
      <PageHero
        eyebrow="Ajuda"
        title="Perguntas Frequentes"
        subtitle="Tudo o que precisa de saber sobre o atendimento, no espaço ou a domicílio."
        image="/images/galeria/cliente-resultado-1.jpg"
      />

      <section className="container-luxe py-16 md:py-24">
        <HomeServiceNote />

        <div className="divide-onyx/10 mx-auto mt-14 max-w-3xl divide-y">
          {FAQS.map((f) => (
            <details key={f.q} className="group py-5">
              <summary className="text-onyx flex cursor-pointer list-none items-center justify-between gap-4 text-lg">
                <span className="font-serif">{f.q}</span>
                <span className="text-gold-deep transition-transform duration-300 group-open:rotate-45">
                  ＋
                </span>
              </summary>
              <p className="text-onyx/60 mt-3 leading-relaxed">{f.a}</p>
            </details>
          ))}
        </div>

        <div className="from-graphite to-onyx mx-auto mt-14 max-w-3xl rounded-3xl bg-gradient-to-br px-8 py-12 text-center">
          <h2 className="heading-serif text-ivory text-2xl md:text-3xl">
            Ainda com dúvidas?
          </h2>
          <p className="text-ivory/70 mt-3">
            Fale diretamente connosco — respondemos rapidinho pelo WhatsApp.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-4">
            <WhatsappButton message={WA_MESSAGES.duvidas} className="btn-gold">
              Tirar dúvidas
            </WhatsappButton>
            <WhatsappButton
              message={WA_MESSAGES.agendar}
              className="btn-outline border-ivory/30 text-ivory hover:text-gold-light"
            >
              Agendar horário
            </WhatsappButton>
          </div>
          <p className="text-ivory/40 mt-6 text-xs">{SITE.whatsappDisplay}</p>
        </div>
      </section>
    </>
  );
}
