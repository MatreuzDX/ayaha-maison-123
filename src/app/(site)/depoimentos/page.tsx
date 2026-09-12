import type { Metadata } from "next";
import { PageHero } from "@/components/site/PageHero";
import { Reveal } from "@/components/site/Reveal";
import { Stars } from "@/components/site/ui";
import { WhatsappButton } from "@/components/site/WhatsappButton";
import { TESTIMONIALS } from "@/server/public-content";
import { WA_MESSAGES } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Depoimentos",
  description:
    "Histórias reais de clientes que viveram a experiência AYAHA MAISON.",
};

export default function DepoimentosPage() {
  const temDepoimentos = TESTIMONIALS.length > 0;
  const avg = temDepoimentos
    ? (
        TESTIMONIALS.reduce((s, t) => s + t.rating, 0) / TESTIMONIALS.length
      ).toFixed(1)
    : null;

  return (
    <>
      <PageHero
        eyebrow="Depoimentos"
        title="A voz de quem confia"
        subtitle={
          avg
            ? `Avaliação média ${avg}/5 entre as nossas clientes.`
            : "O negócio é novo — as primeiras histórias estão a caminho."
        }
        image="/images/galeria/cliente-resultado-1.jpg"
      />

      <section className="container-luxe py-24">
        {temDepoimentos ? (
          <div className="grid gap-8 md:grid-cols-2">
            {TESTIMONIALS.map((t, i) => (
              <Reveal
                key={t.id}
                variant={i % 2 === 0 ? "left" : "right"}
                delay={(i % 2) * 120}
              >
                <figure className="card-luxe h-full p-8">
                  <Stars rating={t.rating} />
                  <blockquote className="text-onyx/80 mt-5 font-serif text-xl leading-relaxed italic">
                    “{t.text}”
                  </blockquote>
                  <figcaption className="border-onyx/10 mt-6 flex items-center gap-3 border-t pt-5">
                    <span className="bg-gold/15 text-gold-deep flex h-11 w-11 items-center justify-center rounded-full font-serif text-lg">
                      {t.name.charAt(0)}
                    </span>
                    <span>
                      <span className="text-onyx block text-sm font-medium">
                        {t.name}
                      </span>
                      <span className="text-gold-deep block text-xs">
                        {t.service}
                      </span>
                    </span>
                  </figcaption>
                </figure>
              </Reveal>
            ))}
          </div>
        ) : (
          /* Sem depoimentos reais ainda. Antes estavam aqui quatro
             inventados — preferimos dizer a verdade e convidar a primeira. */
          <Reveal>
            <div className="border-onyx/10 mx-auto max-w-2xl rounded-3xl border bg-white p-10 text-center">
              <p className="eyebrow">Ainda a começar</p>
              <h2 className="heading-serif text-onyx mt-3 text-2xl md:text-3xl">
                Seja a primeira a contar
              </h2>
              <p className="text-onyx/60 mx-auto mt-4 max-w-md leading-relaxed">
                A AYAHA MAISON é recente e preferimos não inventar depoimentos.
                Entretanto, na galeria há trabalho real que fala por si — e se
                já foi nossa cliente, adorávamos ouvi-la.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-4">
                <WhatsappButton
                  message="Olá, AYAHA MAISON! Queria deixar o meu depoimento sobre o atendimento."
                  className="btn-gold"
                >
                  Deixar o meu depoimento
                </WhatsappButton>
                <a href="/galeria" className="btn-outline">
                  Ver a galeria
                </a>
              </div>
            </div>
          </Reveal>
        )}

        {temDepoimentos && (
          <div className="mt-16 text-center">
            <p className="text-onyx/60">
              Viveu a experiência AYAHA? Adorávamos ouvir você.
            </p>
            <WhatsappButton
              message={WA_MESSAGES.duvidas}
              className="btn-gold mt-5"
            >
              Deixar o meu depoimento
            </WhatsappButton>
          </div>
        )}
      </section>
    </>
  );
}
