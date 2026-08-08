import type { Metadata } from "next";
import { PageHero } from "@/components/site/PageHero";
import { Reveal } from "@/components/site/Reveal";
import { GalleryTile } from "@/components/site/GalleryTile";
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
              <GalleryTile item={g} />
            </Reveal>
          ))}
        </div>
      </section>
    </>
  );
}
