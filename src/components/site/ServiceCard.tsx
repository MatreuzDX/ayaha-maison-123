import Link from "next/link";
import Image from "next/image";
import type { PublicService } from "@/server/public-content";
import { formatEUR } from "@/lib/money";

export function ServiceCard({ service }: { service: PublicService }) {
  return (
    <Link
      href={`/servicos/${service.slug}`}
      className="card-luxe group overflow-hidden hover:-translate-y-1 hover:shadow-[0_20px_50px_-20px_rgba(0,0,0,0.35)]"
    >
      <div className="relative aspect-[4/5] overflow-hidden">
        <Image
          src={service.imageUrl}
          alt={service.name}
          fill
          sizes="(max-width: 768px) 100vw, 33vw"
          className="object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="from-onyx/50 absolute inset-0 bg-gradient-to-t via-transparent to-transparent" />
        <span className="bg-pearl/90 text-onyx absolute top-4 left-4 rounded-full px-3 py-1 text-[0.6rem] font-medium tracking-[0.15em] uppercase">
          {service.category}
        </span>
      </div>
      <div className="p-6">
        <h3 className="text-onyx font-serif text-2xl">{service.name}</h3>
        <p className="text-gold-deep mt-1 text-sm italic">{service.tagline}</p>
        <p className="text-onyx/60 mt-3 line-clamp-2 text-sm leading-relaxed">
          {service.description}
        </p>
        <div className="border-onyx/10 mt-5 flex items-center justify-between border-t pt-4">
          <span className="text-onyx text-lg font-medium">
            {service.priceOnRequest ? "Sob consulta" : formatEUR(service.priceCents)}
          </span>
          <span className="text-gold-deep text-xs tracking-[0.15em] uppercase transition group-hover:translate-x-1">
            Ver mais →
          </span>
        </div>
      </div>
    </Link>
  );
}
