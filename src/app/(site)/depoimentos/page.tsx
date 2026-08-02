import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/site/PageHero";
import { Reveal } from "@/components/site/Reveal";
import { Stars } from "@/components/site/ui";
import { TESTIMONIALS } from "@/server/public-content";

export const metadata: Metadata = {
  title: "Depoimentos",
  description:
    "Histórias reais de clientes que viveram a experiência AYAHA MAISON.",
};

export default function DepoimentosPage() {
  const avg = (
    TESTIMONIALS.reduce((s, t) => s + t.rating, 0) / TESTIMONIALS.length
  ).toFixed(1);

  return (
    <>
      <PageHero
        eyebrow="Depoimentos"
        title="A voz de quem confia"
        subtitle={`Avaliação média ${avg}/5 entre as nossas clientes.`}
        image="https://images.unsplash.com/photo-1522337660859-02fbefca4702?auto=format&fit=crop&w=1920&q=80"
      />

      <section className="container-luxe py-24">
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

        <div className="mt-16 text-center">
          <p className="text-onyx/60">
            Viveu a experiência AYAHA? Adorávamos ouvir você.
          </p>
          <Link href="/contato" className="btn-gold mt-5">
            Deixar o meu depoimento
          </Link>
        </div>
      </section>
    </>
  );
}
