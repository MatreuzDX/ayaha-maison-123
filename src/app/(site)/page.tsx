import Link from "next/link";
import Image from "next/image";
import { Reveal } from "@/components/site/Reveal";
import { ServiceCard } from "@/components/site/ServiceCard";
import { HeroSparkles } from "@/components/site/HeroSparkles";
import { HomeServiceNote } from "@/components/site/HomeServiceNote";
import { WhatsappButton } from "@/components/site/WhatsappButton";
import { SectionHeading, Stars } from "@/components/site/ui";
import { listPublicServices, TESTIMONIALS, GALLERY } from "@/server/public-content";
import { SITE, WA_MESSAGES } from "@/lib/site-config";

// Os cartões de serviço em destaque refletem os preços reais do catálogo —
// sem cache estático, para nunca mostrar um preço que a equipa já mudou.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const services = await listPublicServices();

  return (
    <>
      {/* HERO */}
      <section className="bg-onyx relative flex min-h-[92vh] items-center overflow-hidden">
        <Image
          src="https://images.unsplash.com/photo-1715195060250-b321e5cd5171?auto=format&fit=crop&w=1920&q=80"
          alt="Olhar com extensão de cílios AYAHA MAISON"
          fill
          priority
          className="animate-kenburns object-cover object-center opacity-60"
        />
        <div className="from-onyx via-onyx/70 absolute inset-0 bg-gradient-to-r to-transparent" />
        <HeroSparkles />
        <div className="container-luxe relative z-10">
          <div className="max-w-xl">
            <p className="eyebrow animate-fade-up text-gold-light">{SITE.tagline}</p>
            <h1 className="heading-serif text-ivory animate-fade-up mt-6 text-5xl [animation-delay:120ms] md:text-7xl">
              A arte de um
              <br />
              <span className="text-gold italic">olhar inesquecível</span>
            </h1>
            <p className="text-ivory/75 animate-fade-up mt-7 max-w-md text-lg leading-relaxed [animation-delay:260ms]">
              Extensão de cílios de alto padrão, com{" "}
              <span className="text-gold-light">atendimento a domicílio</span> em
              Lisboa. Técnica, higiene e um design sob medida — no conforto da
              sua casa.
            </p>
            <div className="animate-fade-up mt-10 flex flex-wrap gap-4 [animation-delay:400ms]">
              <WhatsappButton message={WA_MESSAGES.agendar} className="btn-gold">
                Agendar pelo WhatsApp
              </WhatsappButton>
              <Link
                href="/servicos"
                className="btn-outline border-ivory/30 text-ivory hover:text-gold-light"
              >
                Ver serviços
              </Link>
            </div>
            <p className="text-ivory/50 animate-fade-up mt-5 text-xs tracking-[0.2em] uppercase [animation-delay:520ms]">
              Benfica · Lisboa e arredores · Mediante agendamento
            </p>
          </div>
        </div>
        <div className="text-ivory/50 absolute bottom-8 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-2">
          <span className="text-[0.6rem] tracking-[0.3em] uppercase">Role para descobrir</span>
          <span className="animate-cue from-gold-light h-8 w-px bg-gradient-to-b to-transparent" />
        </div>
      </section>

      {/* ATENDIMENTO A DOMICÍLIO */}
      <section className="container-luxe pt-20">
        <Reveal>
          <HomeServiceNote />
        </Reveal>
      </section>

      {/* FILOSOFIA */}
      <section className="container-luxe py-24">
        <div className="grid items-center gap-14 md:grid-cols-2">
          <Reveal variant="left">
            <div className="group relative aspect-[4/5] overflow-hidden rounded-2xl">
              <Image
                src="/images/fundadora.jpg"
                alt="Fundadora da AYAHA MAISON"
                fill
                className="object-cover object-top transition-transform duration-[1200ms] ease-out group-hover:scale-105"
              />
            </div>
          </Reveal>
          <Reveal variant="right" delay={120}>
            <SectionHeading
              eyebrow="A nossa história"
              title="Nascida de um sonho"
              subtitle="A AYAHA MAISON nasceu do sonho de uma mãe. Com a chegada da nossa filha, descobri em mim uma força que não conhecia — e dela nasceu esta dedicação à arte do olhar."
            />
            <ul className="mt-8 space-y-4">
              {[
                "Profissional dedicada e atenta ao detalhe",
                "Materiais premium e hipoalergénicos",
                "Higiene rigorosa em cada sessão",
                "Design personalizado para cada olhar",
              ].map((t) => (
                <li key={t} className="text-onyx/70 flex items-center gap-3">
                  <span className="bg-gold/15 text-gold-deep flex h-6 w-6 flex-none items-center justify-center rounded-full">
                    ✓
                  </span>
                  {t}
                </li>
              ))}
            </ul>
            <Link href="/sobre" className="btn-dark mt-9">
              Conheça a nossa história
            </Link>
          </Reveal>
        </div>
      </section>

      {/* SERVIÇOS */}
      <section className="bg-ivory py-24">
        <div className="container-luxe">
          <Reveal>
            <SectionHeading
              eyebrow="Serviços"
              title="Técnicas exclusivas"
              subtitle="Do natural ao marcante, encontramos o design ideal para a sua expressão."
              center
            />
          </Reveal>
          <div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {services.slice(0, 3).map((s, i) => (
              <Reveal key={s.slug} variant="scale" delay={i * 100}>
                <ServiceCard service={s} />
              </Reveal>
            ))}
          </div>
          <div className="mt-12 text-center">
            <Link href="/servicos" className="btn-outline">
              Todos os serviços
            </Link>
          </div>
        </div>
      </section>

      {/* DIFERENCIAIS */}
      <section className="from-pearl via-blush/40 to-ivory bg-gradient-to-br py-20">
        <div className="container-luxe grid gap-10 text-center sm:grid-cols-2 md:grid-cols-4">
          {[
            { t: "A domicílio", d: "No conforto da sua casa" },
            { t: "Feito à mão", d: "Cada leque, com cuidado" },
            { t: "Materiais premium", d: "Hipoalergénicos e seguros" },
            { t: "Em Lisboa", d: "Benfica e arredores" },
          ].map((s, i) => (
            <Reveal key={s.t} delay={i * 80} variant="up">
              <div>
                <p className="text-onyx font-serif text-3xl md:text-4xl">{s.t}</p>
                <span className="bg-rose/60 mx-auto mt-3 block h-px w-8" />
                <p className="text-onyx/50 mt-3 text-xs tracking-[0.2em] uppercase">{s.d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* GALERIA PREVIEW */}
      <section className="container-luxe py-24">
        <Reveal>
          <SectionHeading eyebrow="Galeria" title="Resultados que falam por si" center />
        </Reveal>
        <div className="mt-14 grid grid-cols-2 gap-4 md:grid-cols-4">
          {GALLERY.slice(0, 4).map((g, i) => (
            <Reveal key={g.id} delay={i * 80}>
              <div className="group relative aspect-square overflow-hidden rounded-xl">
                <Image
                  src={g.image}
                  alt={g.title}
                  fill
                  sizes="25vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="from-onyx/70 absolute inset-0 flex items-end bg-gradient-to-t to-transparent p-4 opacity-0 transition group-hover:opacity-100">
                  <span className="text-ivory text-sm">{g.title}</span>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
        <div className="mt-12 text-center">
          <Link href="/galeria" className="btn-outline">
            Ver galeria completa
          </Link>
        </div>
      </section>

      {/* DEPOIMENTOS */}
      <section className="bg-graphite py-24">
        <div className="container-luxe">
          <Reveal>
            <SectionHeading eyebrow="Depoimentos" title="Quem viveu, recomenda" center light />
          </Reveal>
          <div className="mt-14 grid gap-8 md:grid-cols-2">
            {TESTIMONIALS.slice(0, 2).map((t, i) => (
              <Reveal key={t.id} variant={i === 0 ? "left" : "right"} delay={i * 120}>
                <figure className="hover-lift border-ivory/10 bg-onyx/40 hover:border-gold/30 h-full rounded-2xl border p-8">
                  <Stars rating={t.rating} />
                  <blockquote className="text-ivory/90 mt-5 font-serif text-xl leading-relaxed italic">
                    “{t.text}”
                  </blockquote>
                  <figcaption className="mt-6 text-sm">
                    <span className="text-gold-light">{t.name}</span>
                    <span className="text-ivory/50"> · {t.service}</span>
                  </figcaption>
                </figure>
              </Reveal>
            ))}
          </div>
          <div className="mt-12 text-center">
            <Link
              href="/depoimentos"
              className="btn-outline border-ivory/30 text-ivory hover:text-gold-light"
            >
              Mais depoimentos
            </Link>
          </div>
        </div>
      </section>

      {/* FIDELIDADE CTA */}
      <section className="container-luxe py-24">
        <Reveal>
          <div className="from-graphite to-onyx relative overflow-hidden rounded-3xl bg-gradient-to-br px-8 py-16 text-center md:px-16">
            <div className="bg-gold/10 absolute -top-16 -right-16 h-64 w-64 rounded-full blur-3xl" />
            <p className="eyebrow text-gold-light">Programa de Fidelidade</p>
            <h2 className="heading-serif text-ivory mx-auto mt-4 max-w-2xl text-4xl md:text-5xl">
              Cada visita conta para uma recompensa
            </h2>
            <p className="text-ivory/70 mx-auto mt-5 max-w-xl">
              A cada 5 atendimentos, escolha uma recompensa no{" "}
              <span className="text-gold-light">AYAHA Club</span>.
            </p>
            <div className="mt-9 flex flex-wrap justify-center gap-4">
              <Link href="/fidelidade" className="btn-gold">
                Conhecer o programa
              </Link>
              <Link
                href="/login"
                className="btn-outline border-ivory/30 text-ivory hover:text-gold-light"
              >
                Entrar / Criar conta
              </Link>
            </div>
          </div>
        </Reveal>
      </section>
    </>
  );
}
