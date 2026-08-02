import type { Metadata } from "next";
import { PageHero } from "@/components/site/PageHero";
import { Reveal } from "@/components/site/Reveal";
import { ServiceCard } from "@/components/site/ServiceCard";
import { HomeServiceNote } from "@/components/site/HomeServiceNote";
import { WhatsappButton } from "@/components/site/WhatsappButton";
import { SectionHeading } from "@/components/site/ui";
import { listPublicServices } from "@/server/public-content";
import { WA_MESSAGES } from "@/lib/site-config";

// Dinâmico: reflete os preços editados no CRM.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Serviços",
  description:
    "Extensão de cílios (fio a fio, volume brasileiro, russo, egípcio, fox eyes, gatinho e esquilo), com atendimento a domicílio em Lisboa.",
};

export default async function ServicosPage() {
  const services = await listPublicServices();

  return (
    <>
      <PageHero
        eyebrow="Serviços"
        title="Extensão de Cílios"
        subtitle="Um design de olhar sob medida — no conforto da sua casa, em Lisboa."
        image="https://images.unsplash.com/photo-1596704017254-9b121068fb31?auto=format&fit=crop&w=1920&q=80"
      />

      <section className="container-luxe py-16 md:py-24">
        <Reveal>
          <HomeServiceNote />
        </Reveal>

        <div className="mt-16">
          <Reveal>
            <SectionHeading
              eyebrow="Nosso menu"
              title="Técnicas exclusivas"
              subtitle="Do natural ao marcante. Todos os serviços incluem consultoria de design e higienização completa."
            />
          </Reveal>
          <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((s, i) => (
              <Reveal key={s.slug} variant="scale" delay={(i % 3) * 100}>
                <ServiceCard service={s} />
              </Reveal>
            ))}
          </div>
        </div>

        <Reveal>
          <div className="from-graphite to-onyx mt-20 rounded-3xl bg-gradient-to-br px-8 py-14 text-center md:px-16">
            <p className="eyebrow text-gold-light">Orçamento sem compromisso</p>
            <h2 className="heading-serif text-ivory mx-auto mt-4 max-w-2xl text-3xl md:text-4xl">
              Fale com a AYAHA e agende a sua visita
            </h2>
            <p className="text-ivory/70 mx-auto mt-4 max-w-xl">
              Atendemos a domicílio em Lisboa e arredores, mediante agendamento.
              Peça já o seu orçamento pelo WhatsApp.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <WhatsappButton
                message={WA_MESSAGES.agendar}
                className="btn-gold"
              >
                Agendar pelo WhatsApp
              </WhatsappButton>
              <WhatsappButton
                message={WA_MESSAGES.duvidas}
                className="btn-outline border-ivory/30 text-ivory hover:text-gold-light"
              >
                Tirar dúvidas
              </WhatsappButton>
            </div>
          </div>
        </Reveal>
      </section>
    </>
  );
}
