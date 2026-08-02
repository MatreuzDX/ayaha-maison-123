import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { PageHero } from "@/components/site/PageHero";
import { Reveal } from "@/components/site/Reveal";
import { SectionHeading } from "@/components/site/ui";

export const metadata: Metadata = {
  title: "Sobre",
  description:
    "A história da AYAHA MAISON — nascida do sonho de uma mãe, dedicada à arte do olhar, com atendimento a domicílio em Lisboa.",
};

const VALORES = [
  {
    t: "Excelência",
    d: "Padrão internacional em cada detalhe, do atendimento ao acabamento.",
  },
  {
    t: "Segurança",
    d: "Higiene rigorosa e produtos hipoalergénicos certificados.",
  },
  {
    t: "Personalização",
    d: "Um design de cílios exclusivo para cada formato de olho.",
  },
];

export default function SobrePage() {
  return (
    <>
      <PageHero
        eyebrow="Sobre a Maison"
        title="Uma dedicação à arte do olhar"
        image="https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?auto=format&fit=crop&w=1920&q=80"
      />

      <section className="container-luxe py-24">
        <div className="grid items-center gap-14 md:grid-cols-2">
          <Reveal>
            <SectionHeading
              eyebrow="A nossa essência"
              title="Uma longa história, que nasce do amor"
            />
            <div className="text-onyx/65 mt-6 space-y-5 leading-relaxed">
              <p>
                A AYAHA MAISON nasceu do sonho de uma mãe, há cerca de um ano.
                No dia 21 de julho de 2025, a nossa filha nasceu — e trouxe um
                amor inesperado e mágico.
              </p>
              <p>
                Com ela, nasceu também uma nova versão de nós mesmas. Descobri
                em mim uma força que não conhecia, e dela veio esta dedicação à
                arte do olhar.
              </p>
              <p>
                Hoje, levo esse mesmo cuidado a cada cliente — no conforto da
                sua casa, em Lisboa. Mais do que cílios, entrego confiança e um
                olhar que expressa a sua melhor versão.
              </p>
            </div>
          </Reveal>
          <Reveal variant="right" delay={120}>
            <div className="border-onyx/5 relative aspect-[4/5] overflow-hidden rounded-2xl border">
              <Image
                src="/images/marca-ayaha.png"
                alt="AYAHA MAISON — estética suave e delicada"
                fill
                className="object-cover"
              />
            </div>
          </Reveal>
        </div>
      </section>

      <section className="bg-ivory py-24">
        <div className="container-luxe">
          <Reveal>
            <SectionHeading eyebrow="Valores" title="O que nos guia" center />
          </Reveal>
          <div className="mt-14 grid gap-8 md:grid-cols-3">
            {VALORES.map((v, i) => (
              <Reveal key={v.t} variant="scale" delay={i * 100}>
                <div className="card-luxe h-full p-8 text-center">
                  <div className="bg-gold/15 text-gold-deep mx-auto flex h-14 w-14 items-center justify-center rounded-full font-serif text-2xl">
                    {i + 1}
                  </div>
                  <h3 className="text-onyx mt-5 font-serif text-2xl">{v.t}</h3>
                  <p className="text-onyx/60 mt-3 text-sm leading-relaxed">
                    {v.d}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="container-luxe py-24 text-center">
        <Reveal>
          <SectionHeading
            eyebrow="Venha nos conhecer"
            title="Reserve a sua experiência"
            center
          />
          <div className="mt-8 flex justify-center gap-4">
            <Link href="/servicos" className="btn-gold">
              Ver serviços
            </Link>
            <Link href="/contato" className="btn-outline">
              Falar com a Maison
            </Link>
          </div>
        </Reveal>
      </section>
    </>
  );
}
