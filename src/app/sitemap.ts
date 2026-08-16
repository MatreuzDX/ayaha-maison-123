import type { MetadataRoute } from "next";
import { listPublicServices } from "@/server/public-content";

// Reflete os serviços editados no CRM — mesmo motivo do `dynamic` nas
// páginas de serviços (ver `src/app/(site)/servicos/page.tsx`).
export const dynamic = "force-dynamic";

/**
 * `NEXT_PUBLIC_APP_URL` aponta para `localhost:3000` em desenvolvimento
 * (ver `.env.example`); em produção o Vercel define-a para o domínio real.
 * O sitemap precisa sempre de URLs absolutos — um sitemap com
 * `http://localhost:3000/...` publicado por engano não indexa nada.
 */
function baseUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL;
  if (fromEnv && !fromEnv.includes("localhost")) return fromEnv;
  return "https://ayaha-crm.vercel.app";
}

/**
 * Só a zona pública entra aqui — `/app` e `/conta` são áreas com sessão,
 * já marcadas `noindex` no layout raiz (ver `src/app/layout.tsx`), e não
 * têm nada que valha a pena o Google rastrear.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = baseUrl();
  const now = new Date();

  const paginasFixas: MetadataRoute.Sitemap = [
    { url: `${site}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${site}/sobre`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${site}/servicos`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${site}/galeria`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${site}/depoimentos`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${site}/fidelidade`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${site}/faq`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${site}/contato`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
  ];

  const services = await listPublicServices();
  const paginasDeServico: MetadataRoute.Sitemap = services.map((s) => ({
    url: `${site}/servicos/${s.slug}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [...paginasFixas, ...paginasDeServico];
}
