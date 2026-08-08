"use client";

import { useState } from "react";
import Image from "next/image";
import type { GalleryItem } from "@/server/public-content";

/**
 * Um quadrado da galeria — foto ou vídeo.
 *
 * O vídeo só é carregado depois de alguém carregar no play. Um vídeo a
 * arrancar sozinho gastava dados de quem entrou no site pelo telemóvel só
 * para ver fotos, e a maioria das clientes entra assim.
 */
export function GalleryTile({ item }: { item: GalleryItem }) {
  const [playing, setPlaying] = useState(false);

  if (item.video && playing) {
    return (
      <div className="relative aspect-square overflow-hidden rounded-xl bg-black">
        <video
          src={item.video}
          poster={item.image}
          controls
          autoPlay
          muted
          playsInline
          loop
          className="h-full w-full object-cover"
        />
      </div>
    );
  }

  return (
    <div className="group relative aspect-square overflow-hidden rounded-xl">
      <Image
        src={item.image}
        alt={item.title}
        fill
        sizes="(max-width: 768px) 50vw, 25vw"
        className="object-cover transition-transform duration-700 group-hover:scale-110"
      />

      {item.video && (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          aria-label={`Ver vídeo: ${item.title}`}
          className="absolute inset-0 flex items-center justify-center bg-black/25 transition hover:bg-black/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/90 shadow-lg transition group-hover:scale-110">
            <svg
              viewBox="0 0 24 24"
              className="text-onyx ml-1 h-6 w-6"
              fill="currentColor"
              aria-hidden
            >
              <path d="M8 5.5v13l11-6.5L8 5.5Z" />
            </svg>
          </span>
        </button>
      )}

      <div className="from-onyx/70 pointer-events-none absolute inset-0 flex items-end bg-gradient-to-t to-transparent p-4 opacity-0 transition group-hover:opacity-100">
        <div>
          <span className="text-ivory text-sm">{item.title}</span>
          <span className="text-ivory/60 block text-xs">{item.category}</span>
        </div>
      </div>
    </div>
  );
}
