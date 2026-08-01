import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Jost } from "next/font/google";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const jost = Jost({
  variable: "--font-jost",
  subsets: ["latin"],
  display: "swap",
});

// O título e o "robots" definitivos vivem em cada zona (site público, /app,
// /conta) — este layout serve as fallback neutro, sem presumir marca de
// ferramenta interna nem de site de marketing. Um `template` aqui aplicar-
// se-ia por cima do título de QUALQUER zona (mesmo as que definem o seu
// próprio), o que é exatamente o problema que já aconteceu uma vez.
export const metadata: Metadata = {
  title: "AYAHA MAISON",
  description: "Gestão da AYAHA MAISON — clientes, agenda e financeiro.",
  // Seguro por omissão: só a zona pública reverte isto explicitamente.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f5f1" },
    { media: "(prefers-color-scheme: dark)", color: "#0e0e0e" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="pt-PT"
      className={`${cormorant.variable} ${jost.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
