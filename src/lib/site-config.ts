/**
 * Configuração do site público — nome, contactos, navegação.
 *
 * Herdado do site institucional. Um só sítio para trocar o número de
 * WhatsApp, morada de atendimento, etc.
 */

const WHATSAPP_E164 = "351933055502";

export const SITE = {
  name: "AYAHA MAISON",
  tagline: "Maison de Beleza • Extensão de Cílios",
  description:
    "AYAHA MAISON — extensão de cílios com atendimento a domicílio em Lisboa (Benfica e arredores). Técnica, higiene e um olhar sob medida, no conforto da sua casa.",
  whatsapp: WHATSAPP_E164,
  whatsappDisplay: "+351 933 055 502",
  email: "contato@ayahamaison.com",
  baseArea: "Benfica, Lisboa",
  serviceArea: "Lisboa e arredores",
  hours: "Mediante agendamento",
  homeServiceNote:
    "Atendimento exclusivamente a domicílio, na casa da cliente. Cobrimos principalmente Lisboa e arredores, com base em Benfica. O deslocamento poderá ter custo adicional conforme a distância.",
  social: {
    instagram: "https://instagram.com/ayahamaison",
    facebook: "https://facebook.com/ayahamaison",
    tiktok: "https://tiktok.com/@ayahamaison",
  },
} as const;

export const NAV = [
  { label: "Início", href: "/" },
  { label: "Sobre", href: "/sobre" },
  { label: "Serviços", href: "/servicos" },
  { label: "Galeria", href: "/galeria" },
  { label: "Depoimentos", href: "/depoimentos" },
  { label: "FAQ", href: "/faq" },
  { label: "Contacto", href: "/contato" },
] as const;

/** Mensagens prontas para os botões de WhatsApp do site. */
export const WA_MESSAGES = {
  agendar:
    "Olá, AYAHA MAISON! Gostaria de agendar um horário para atendimento a domicílio. 💛",
  duvidas: "Olá, AYAHA MAISON! Tenho uma dúvida sobre os serviços.",
  servico: (nome: string) =>
    `Olá, AYAHA MAISON! Tenho interesse no serviço "${nome}" (atendimento a domicílio). Podem indicar-me disponibilidade?`,
};
