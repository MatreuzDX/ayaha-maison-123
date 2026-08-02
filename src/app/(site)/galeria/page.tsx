import type { Metadata } from "next";
import Image from "next/image";
import { PageHero } from "@/components/site/PageHero";
import { Reveal } from "@/components/site/Reveal";
import { GALLERY } from "@/server/public-content";

export const metadata: Metadata = {
  title: "Galeria",
  description: "Veja resultados reais de extensão de cílios da AYAHA MAISON.",
};

export default function GaleriaPage() {
  return (
    <>
      <PageHero
        eyebrow="Galeria"
        title="Os nossos resultados"
        subtitle="Cada olhar, uma obra."
        image="https://images.unsplash.com/photo-1560869713-7d0a29430803?auto=format&fit=crop&w=1920&q=80"
      />

      <section className="container-luxe py-24">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {GALLERY.map((g, i) => (
            <Reveal key={g.id} variant="scale" delay={(i % 4) * 80}>
              <div className="group relative aspect-square overflow-hidden rounded-xl">
                <Image
                  src={g.image}
                  alt={g.title}
                  fill
                  sizes="(max-width: 768px) 50vw, 25vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="from-onyx/70 absolute inset-0 flex items-end bg-gradient-to-t to-transparent p-4 opacity-0 transition group-hover:opacity-100">
                  <div>
                    <span className="text-ivory text-sm">{g.title}</span>
                    <span className="text-ivory/60 block text-xs">
                      {g.category}
                    </span>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>
    </>
  );
}
