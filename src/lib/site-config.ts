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
    "AYAHA MAISON — extensão de cílios em Benfica, Lisboa. Atendimento no nosso espaço ou a domicílio, à escolha da cliente. Técnica, higiene e um olhar sob medida.",
  whatsapp: WHATSAPP_E164,
  whatsappDisplay: "+351 933 055 502",
  email: "contato@ayahamaison.com",
  baseArea: "Benfica, Lisboa",
  serviceArea: "Lisboa e arredores",
  hours: "Mediante agendamento",
  /**
   * Desde 16/08/2026 há duas formas de atender, à escolha da cliente:
   * no espaço físico (partilhado com o Studio Izabela Vieira, salão de
   * unhas já estabelecido na morada) ou a domicílio, como sempre foi.
   * Antes disso o negócio era só a domicílio — se vir texto por aí a
   * dizer "exclusivamente a domicílio", está desatualizado.
   */
  homeServiceNote:
    "Atendimento no nosso espaço em Benfica ou a domicílio — a combinar consigo. Cobrimos Lisboa e arredores; ao domicílio, o deslocamento poderá ter custo adicional conforme a distância.",
  studio: {
    streetAddress: "R. Gonçalves Viana 6A",
    postalCode: "1500-134",
    city: "Lisboa",
    /** Endereço completo, pronto a mostrar. */
    full: "R. Gonçalves Viana 6A, 1500-134 Lisboa",
    mapsUrl: "https://www.google.com/maps/place/Studio+Izabela+vieira/@38.7443811,-9.1771935,71m/data=!3m1!1e3!4m6!3m5!1s0xd1933006025c507:0x51701179f90b39a9!8m2!3d38.7443583!4d-9.177016!16s%2Fg%2F11mspxffw6",
  },
  /**
   * Só o que existe mesmo.
   *
   * Até 10/08/2026 havia aqui três redes. O Instagram apontava para
   * `ayahamaison` — o perfil da casa é `maisonayaha`, invertido, por isso o
   * botão do rodapé levava a lado nenhum. O Facebook e o TikTok nunca
   * existiram: `tiktok.com/@ayahamaison` responde "Couldn't find this
   * account" e a página do Facebook não está disponível.
   *
   * Um ícone que não abre nada custa mais confiança do que a rede em falta.
   * Se um dia forem criados, acrescentam-se aqui e os ícones voltam sozinhos.
   */
  social: {
    instagram: "https://www.instagram.com/maisonayaha/",
    instagramHandle: "@maisonayaha",
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
    "Olá, AYAHA MAISON! Gostaria de agendar um horário — no espaço ou a domicílio. 💛",
  duvidas: "Olá, AYAHA MAISON! Tenho uma dúvida sobre os serviços.",
  servico: (nome: string) =>
    `Olá, AYAHA MAISON! Tenho interesse no serviço "${nome}". Podem indicar-me disponibilidade, no espaço ou a domicílio?`,
};
