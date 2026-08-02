import Image from "next/image";

/** Cabeçalho alto usado no topo de cada página institucional do site. */
export function PageHero({
  eyebrow,
  title,
  subtitle,
  image,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  image: string;
}) {
  return (
    <section className="bg-onyx relative flex h-[52vh] min-h-[380px] items-center overflow-hidden">
      <Image
        src={image}
        alt=""
        fill
        priority
        className="object-cover opacity-45"
      />
      <div className="from-onyx via-onyx/40 absolute inset-0 bg-gradient-to-t to-transparent" />
      <div className="container-luxe relative z-10 max-w-2xl text-center md:text-left">
        <p className="eyebrow text-gold-light animate-fade-up">{eyebrow}</p>
        <h1 className="heading-serif text-ivory animate-fade-up mt-4 text-4xl md:text-6xl">
          {title}
        </h1>
        {subtitle && (
          <p className="text-ivory/75 animate-fade-up mt-5 text-lg">
            {subtitle}
          </p>
        )}
      </div>
    </section>
  );
}
