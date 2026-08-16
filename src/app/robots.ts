import type { MetadataRoute } from "next";

function baseUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL;
  if (fromEnv && !fromEnv.includes("localhost")) return fromEnv;
  return "https://ayaha-crm.vercel.app";
}

/**
 * `/app` e `/conta` já são `noindex` por metadata (ver `src/app/layout.tsx`
 * e a nota em `src/app/(site)/layout.tsx`) — isso impede a indexação, mas
 * não impede o rastreio. Bloquear aqui também poupa orçamento de rastreio
 * do Google a páginas com sessão, que ele nunca vai conseguir ver de
 * qualquer forma (o `proxy.ts` manda-o para `/login`).
 */
export default function robots(): MetadataRoute.Robots {
  const site = baseUrl();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/app", "/conta", "/api"],
    },
    sitemap: `${site}/sitemap.xml`,
  };
}
