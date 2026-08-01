import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Fotos de referência do catálogo público, herdadas do site — a
      // trocar por fotos reais da AYAHA MAISON à medida que existirem.
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
};

export default nextConfig;
