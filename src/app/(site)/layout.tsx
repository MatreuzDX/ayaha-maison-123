import type { Metadata } from "next";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { WhatsappFloat } from "@/components/site/WhatsappFloat";
import { getClientSession } from "@/server/client-auth";
import { SITE } from "@/lib/site-config";

/**
 * Casca do site público. Cobre `/`, `/servicos`, `/sobre`, etc. — tudo o que
 * não é `/app` (equipa) nem `/conta` (cliente autenticada), que têm as suas
 * próprias cascas.
 *
 * `robots` fica a `index: true` aqui, ao contrário do layout raiz — que
 * continua `noindex` por omissão para proteger `/app` e `/conta`. Esta é a
 * única zona pensada para aparecer no Google.
 */
export const metadata: Metadata = {
  title: { default: `${SITE.name} — Extensão de Cílios Premium`, template: `%s — ${SITE.name}` },
  description: SITE.description,
  keywords: [
    "extensão de cílios Lisboa",
    "cílios a domicílio Lisboa",
    "volume russo Lisboa",
    "volume egípcio Lisboa",
    "pestanas Benfica",
    "AYAHA MAISON",
    "fox eyes",
  ],
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    locale: "pt_PT",
    siteName: SITE.name,
    title: `${SITE.name} — Extensão de Cílios Premium`,
    description: SITE.description,
  },
};

export default async function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getClientSession();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "HealthAndBeautyBusiness",
    name: SITE.name,
    description: SITE.description,
    telephone: `+${SITE.whatsapp}`,
    email: SITE.email,
    address: {
      "@type": "PostalAddress",
      streetAddress: SITE.studio.streetAddress,
      postalCode: SITE.studio.postalCode,
      addressLocality: "Benfica",
      addressRegion: "Lisboa",
      addressCountry: "PT",
    },
    hasMap: SITE.studio.mapsUrl,
    areaServed: { "@type": "City", name: "Lisboa" },
    availableService: ["Extensão de cílios"],
    serviceType: "Extensão de cílios em estúdio ou a domicílio",
    priceRange: "€€",
    sameAs: [SITE.social.instagram],
  };

  return (
    /* `site-light`: o site público é sempre claro. Os seus componentes usam
       as cores da marca diretamente, por isso num telemóvel em modo escuro
       o fundo escurecia e o texto ficava preto sobre preto. Ver globals.css. */
    <div className="site-light">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Header loggedIn={Boolean(session)} />
      {/* overflow-x-clip: contém as animações que entram de lado sem criar
          barra horizontal, sem quebrar o cabeçalho sticky (que é irmão
          deste main). O espaço em baixo evita que o botão flutuante do
          WhatsApp tape o fim do conteúdo no telemóvel. */}
      <main id="conteudo" className="overflow-x-clip pb-20 sm:pb-0">
        {children}
      </main>
      <Footer />
      <WhatsappFloat />
    </div>
  );
}
