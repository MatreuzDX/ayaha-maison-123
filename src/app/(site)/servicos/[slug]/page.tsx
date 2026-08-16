import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getPublicServiceBySlug,
  listPublicServices,
} from "@/server/public-content";
import { formatEUR } from "@/lib/money";
import { Reveal } from "@/components/site/Reveal";
import { ServiceCard } from "@/components/site/ServiceCard";
import { WhatsappButton } from "@/components/site/WhatsappButton";
import { WA_MESSAGES } from "@/lib/site-config";

// Dinâmico: reflete no site os preços editados no CRM.
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const service = await getPublicServiceBySlug(slug);
  if (!service) return { title: "Serviço não encontrado" };
  return {
    title: service.name,
    description: service.description,
    openGraph: { images: [service.imageUrl] },
  };
}

export default async function ServiceDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const service = await getPublicServiceBySlug(slug);
  if (!service) notFound();

  const all = await listPublicServices();
  const related = all.filter((s) => s.slug !== service.slug).slice(0, 3);

  return (
    <>
      <section className="container-luxe grid gap-12 py-16 md:grid-cols-2 md:py-24">
        <Reveal>
          <div className="relative aspect-[4/5] overflow-hidden rounded-2xl">
            <Image
              src={service.imageUrl}
              alt={service.name}
              fill
              priority
              className="object-cover"
            />
          </div>
        </Reveal>

        <Reveal variant="right" delay={100}>
          <div className="flex h-full flex-col justify-center">
            <div className="flex items-center gap-3">
              <span className="bg-pearl/90 text-onyx rounded-full px-3 py-1 text-[0.6rem] font-medium tracking-[0.15em] uppercase">
                {service.category}
              </span>
              <span className="text-onyx/50 text-xs tracking-[0.15em] uppercase">
                {service.durationMin} min
              </span>
            </div>
            <h1 className="heading-serif text-onyx mt-4 text-4xl md:text-5xl">
              {service.name}
            </h1>
            {service.tagline && (
              <p className="text-gold-deep mt-2 font-serif text-xl italic">
                {service.tagline}
              </p>
            )}

            <div className="text-onyx/65 mt-6 space-y-4 leading-relaxed">
              {service.longDescription.length > 0 ? (
                service.longDescription.map((p, i) => <p key={i}>{p}</p>)
              ) : (
                <p>{service.description}</p>
              )}
            </div>

            {service.highlights.length > 0 && (
              <ul className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {service.highlights.map((h) => (
                  <li
                    key={h}
                    className="text-onyx/70 flex items-center gap-2 text-sm"
                  >
                    <span className="text-gold-deep">✦</span> {h}
                  </li>
                ))}
              </ul>
            )}

            <div className="border-onyx/10 mt-8 flex items-end justify-between border-t pt-6">
              <div>
                <span className="text-onyx/50 text-xs tracking-[0.15em] uppercase">
                  {service.priceOnRequest ? "Valor" : "A partir de"}
                </span>
                <p className="text-onyx font-serif text-4xl">
                  {service.priceOnRequest
                    ? "Sob consulta"
                    : formatEUR(service.priceCents)}
                </p>
                <p className="text-gold-deep mt-1 text-xs">
                  Conta para o seu cartão AYAHA Club
                </p>
              </div>
              <span className="bg-ivory text-onyx/60 rounded-full px-3 py-1 text-xs">
                No espaço ou a domicílio · Benfica, Lisboa
              </span>
            </div>

            <div className="mt-6">
              <WhatsappButton
                message={WA_MESSAGES.servico(service.name)}
                className="btn-gold w-full justify-center"
              >
                Agendar pelo WhatsApp
              </WhatsappButton>
            </div>
          </div>
        </Reveal>
      </section>

      {related.length > 0 && (
        <section className="bg-ivory py-20">
          <div className="container-luxe">
            <h2 className="heading-serif text-onyx text-3xl">
              Também pode gostar
            </h2>
            <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((s) => (
                <ServiceCard key={s.slug} service={s} />
              ))}
            </div>
          </div>
        </section>
      )}

      <div className="py-8 text-center">
        <Link
          href="/servicos"
          className="text-onyx/50 hover:text-gold-deep text-sm underline"
        >
          ← Ver todos os serviços
        </Link>
      </div>
    </>
  );
}
