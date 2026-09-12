import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHero } from "@/components/site/PageHero";
import { Reveal } from "@/components/site/Reveal";
import { SectionHeading } from "@/components/site/ui";
import { WhatsappButton } from "@/components/site/WhatsappButton";
import { getPublicLoyaltyProgram } from "@/server/public-content";
import { WA_MESSAGES } from "@/lib/site-config";

// Dinâmico: reflete o programa tal como está configurado no CRM.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "AYAHA Club",
  description:
    "O programa de fidelidade da AYAHA MAISON: a cada 5 atendimentos, escolhe uma recompensa.",
};

export default async function FidelidadePage() {
  const program = await getPublicLoyaltyProgram();
  if (!program) notFound();

  return (
    <>
      <PageHero
        eyebrow="Programa de fidelidade"
        title={program.name}
        subtitle={`A cada ${program.stampsRequired} atendimentos, uma recompensa à sua escolha.`}
        image="/images/cilios-real-2.jpg"
      />

      <section className="container-luxe py-20 md:py-24">
        <Reveal>
          <SectionHeading
            eyebrow="Como funciona"
            title="Simples como deve ser"
            subtitle="Sem pontos para contar, sem tabelas para decorar. Um carimbo por atendimento."
            center
          />
        </Reveal>

        <div className="mx-auto mt-14 max-w-2xl">
          <Reveal variant="scale">
            <div className="border-onyx/10 rounded-3xl border bg-white p-8 text-center shadow-[0_2px_20px_-12px_rgba(0,0,0,0.15)] md:p-12">
              <p className="text-onyx/50 text-xs tracking-[0.2em] uppercase">
                O seu cartão
              </p>
              <div
                className="mt-6 flex flex-wrap justify-center gap-3"
                role="img"
                aria-label={`Cartão de ${program.stampsRequired} carimbos`}
              >
                {Array.from({ length: program.stampsRequired }, (_, i) => (
                  <div
                    key={i}
                    className="border-gold/40 text-gold-deep flex h-14 w-14 items-center justify-center rounded-full border-2 border-dashed font-serif text-lg"
                  >
                    {i + 1}
                  </div>
                ))}
              </div>
              <p className="text-onyx/60 mt-6 text-sm">
                Cada atendimento concluído dá um carimbo. Ao completar os{" "}
                {program.stampsRequired}, escolhe a sua recompensa.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="bg-ivory py-20 md:py-24">
        <div className="container-luxe">
          <Reveal>
            <SectionHeading
              eyebrow="Recompensas"
              title="Escolhe a sua"
              subtitle="Ao completar o cartão, a escolha é sua — não nossa."
              center
            />
          </Reveal>

          <div className="mt-14 grid gap-8 md:grid-cols-3">
            {program.rewards.map((reward, i) => (
              <Reveal key={reward.name} variant="scale" delay={i * 100}>
                <div className="card-luxe h-full p-8 text-center">
                  <div className="bg-gold/15 text-gold-deep mx-auto flex h-14 w-14 items-center justify-center rounded-full font-serif text-2xl">
                    ✦
                  </div>
                  <h3 className="text-onyx mt-5 font-serif text-2xl">
                    {reward.name}
                  </h3>
                  {reward.description && (
                    <p className="text-onyx/60 mt-3 text-sm leading-relaxed">
                      {reward.description}
                    </p>
                  )}
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="container-luxe py-20 md:py-24">
        <Reveal>
          <div className="from-graphite to-onyx rounded-3xl bg-gradient-to-br px-8 py-14 text-center md:px-16">
            <h2 className="heading-serif text-ivory mx-auto max-w-2xl text-3xl md:text-4xl">
              Comece hoje o seu cartão
            </h2>
            <p className="text-ivory/70 mx-auto mt-4 max-w-xl">
              Crie a sua conta para acompanhar os carimbos, ou marque já o
              primeiro atendimento.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <WhatsappButton
                message={WA_MESSAGES.agendar}
                className="btn-gold"
              >
                Agendar pelo WhatsApp
              </WhatsappButton>
              <Link
                href="/conta/registar"
                className="btn-outline border-ivory/30 text-ivory hover:text-gold-light"
              >
                Criar conta
              </Link>
            </div>
          </div>
        </Reveal>

        {program.termsText && (
          <p className="text-onyx/50 mx-auto mt-8 max-w-2xl text-center text-xs leading-relaxed">
            {program.termsText} A recompensa é válida durante{" "}
            {program.rewardValidDays} dias após ser escolhida.
          </p>
        )}
      </section>
    </>
  );
}
