/**
 * Dados do site público — sem autenticação, sem `Actor`.
 *
 * Deliberadamente à parte de `services/service.service.ts`: aquele exige um
 * `Actor` e aplica permissões de equipa, porque serve o painel interno. Isto
 * aqui serve visitantes anónimos, e só pode ler o que já está marcado como
 * público (`isActive`) — nunca custos, nunca dados de outra cliente.
 */

import {
  CATALOG_SERVICES,
  LOYALTY_PROGRAM,
  LOYALTY_REWARDS,
  SERVICE_PRICE_CENTS,
} from "@/lib/catalog";
import { prisma } from "./db";

/**
 * Lê do banco e, se ele não responder, devolve o catálogo base.
 *
 * O site público não pode cair num ecrã de erro por causa do banco: a 12/09/2026
 * a página inicial e a de serviços deram 500 durante horas porque o banco de
 * produção desapareceu. Quem visita continua a ver o que a AYAHA oferece e o
 * botão do WhatsApp. O erro fica nos logs, para ninguém achar que está tudo bem.
 */
async function fromDbOr<T>(what: string, read: () => Promise<T>, fallback: () => T): Promise<T> {
  try {
    return await read();
  } catch (error) {
    console.error(`[public-content] ${what}: banco indisponível — a mostrar o catálogo base.`, error);
    return fallback();
  }
}

function catalogServices(): PublicService[] {
  return CATALOG_SERVICES.map((s) => ({
    slug: s.slug,
    name: s.name,
    tagline: s.tagline,
    description: "",
    longDescription: [...s.longDescription],
    priceCents: SERVICE_PRICE_CENTS,
    priceOnRequest: false,
    durationMin: s.durationMin,
    imageUrl: s.imageUrl,
    highlights: [...s.highlights],
    category: s.displayCategory,
  }));
}

async function getUnitId(): Promise<string> {
  const slug = process.env.DEFAULT_UNIT_SLUG ?? "benfica";
  const unit = await prisma.unit.findUnique({ where: { slug } });
  if (!unit) throw new Error(`Unidade "${slug}" não encontrada.`);
  return unit.id;
}

export interface PublicService {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  longDescription: string[];
  priceCents: number;
  priceOnRequest: boolean;
  durationMin: number;
  imageUrl: string;
  highlights: string[];
  category: string;
}

/** Fallback para serviços que ainda não têm foto/destaques preenchidos. */
const PLACEHOLDER_IMAGE =
  "/images/cilios-real-1.jpg";

function toPublicService(s: {
  slug: string;
  name: string;
  tagline: string | null;
  description: string | null;
  longDescription: string[];
  priceCents: number;
  priceOnRequest: boolean;
  durationMin: number;
  imageUrl: string | null;
  highlights: string[];
  displayCategory: string | null;
}): PublicService {
  return {
    slug: s.slug,
    name: s.name,
    tagline: s.tagline ?? "",
    description: s.description ?? "",
    longDescription: s.longDescription,
    priceCents: s.priceCents,
    priceOnRequest: s.priceOnRequest,
    durationMin: s.durationMin,
    imageUrl: s.imageUrl ?? PLACEHOLDER_IMAGE,
    highlights: s.highlights,
    category: s.displayCategory ?? "Cílios",
  };
}

export async function listPublicServices(): Promise<PublicService[]> {
  return fromDbOr(
    "listPublicServices",
    async () => {
      const unitId = await getUnitId();
      const services = await prisma.service.findMany({
        where: { unitId, isActive: true, deletedAt: null },
        orderBy: { sortOrder: "asc" },
      });
      return services.map(toPublicService);
    },
    catalogServices,
  );
}

export async function getPublicServiceBySlug(
  slug: string,
): Promise<PublicService | null> {
  return fromDbOr(
    "getPublicServiceBySlug",
    async () => {
      const unitId = await getUnitId();
      const service = await prisma.service.findFirst({
        where: { unitId, slug, isActive: true, deletedAt: null },
      });
      return service ? toPublicService(service) : null;
    },
    () => catalogServices().find((s) => s.slug === slug) ?? null,
  );
}

// ── Programa de fidelidade ───────────────────────────────────

export interface PublicReward {
  name: string;
  description: string;
  valueCents: number;
}

export interface PublicLoyaltyProgram {
  name: string;
  stampsRequired: number;
  termsText: string | null;
  rewardValidDays: number;
  rewards: PublicReward[];
}

/**
 * Lê o programa tal como está configurado no CRM — a página pública nunca
 * deve prometer uma coisa e o sistema fazer outra. Devolve `null` se o
 * programa estiver desligado; nesse caso a página não deve aparecer.
 */
export async function getPublicLoyaltyProgram(): Promise<PublicLoyaltyProgram | null> {
  return fromDbOr(
    "getPublicLoyaltyProgram",
    async () => {
      const unitId = await getUnitId();
      const program = await prisma.loyaltyProgram.findUnique({
        where: { unitId },
        include: {
          rewards: { where: { isActive: true }, orderBy: { sortOrder: "asc" } },
        },
      });

      if (!program || !program.isActive) return null;

      return {
        name: program.name,
        stampsRequired: program.stampsRequired,
        termsText: program.termsText,
        rewardValidDays: program.rewardValidDays,
        rewards: program.rewards.map((r) => ({
          name: r.name,
          description: r.description ?? "",
          valueCents: r.valueCents,
        })),
      };
    },
    () => ({
      name: LOYALTY_PROGRAM.name,
      stampsRequired: LOYALTY_PROGRAM.stampsRequired,
      termsText: LOYALTY_PROGRAM.termsText,
      rewardValidDays: LOYALTY_PROGRAM.rewardValidDays,
      rewards: LOYALTY_REWARDS.map((r) => ({
        name: r.name,
        description: r.description,
        valueCents: r.valueCents,
      })),
    }),
  );
}

// ── Depoimentos e galeria ────────────────────────────────────
//
// Ainda estáticos — não há necessidade de tabela enquanto for a equipa a
// decidir o que mostrar, não as clientes a gerar automaticamente. Se um dia
// isto crescer para dezenas de itens ou precisar de moderação, passa a
// tabela; por agora seria complexidade sem benefício.

export interface Testimonial {
  id: string;
  name: string;
  rating: number;
  text: string;
  service: string;
}

/**
 * Depoimentos REAIS de clientes. Vazio até haver algum.
 *
 * Estavam aqui quatro depoimentos inventados — nomes e textos criados do
 * nada, apresentados no site como se fossem clientes verdadeiras. Foram
 * removidos: numa página que serve para ganhar a confiança de quem ainda
 * não conhece o negócio, uma avaliação falsa é exatamente a coisa errada
 * a ter, e uma cliente que descubra perde a confiança em tudo o resto.
 *
 * Para acrescentar um a sério: pedir autorização à cliente, e juntar aqui
 * com o nome que ela aceitar (primeiro nome basta) e o serviço que fez.
 * A página e a secção da homepage aparecem sozinhas assim que houver um.
 */
export const TESTIMONIALS: Testimonial[] = [];

export interface GalleryItem {
  id: string;
  title: string;
  category: string;
  image: string;
  /**
   * Se existir, o item é um vídeo e `image` passa a ser a capa. Fica em
   * silêncio e só carrega quando alguém carrega no play — um vídeo a
   * arrancar sozinho num telemóvel gasta dados de quem só queria ver fotos.
   */
  video?: string;
}

export const GALLERY: GalleryItem[] = [
  // Trabalho real, agosto de 2026 — as primeiras entradas são as mais
  // recentes de propósito: é o que a visitante vê primeiro.
  //
  // Havia aqui um vídeo de cliente; saiu a 16/08/2026 por decisão do
  // Mateus — a galeria fica só com fotografia. O suporte a vídeo continua
  // de pé (o campo `video` acima e o play em GalleryTile), à espera do
  // próximo: basta voltar a acrescentar uma entrada com `video`.
  //
  // Saíram a 13/09/2026 seis fotografias de banco de imagens que estavam aqui
  // como "resultados" — não eram trabalho da AYAHA. Numa galeria que se chama
  // "Os nossos resultados", só entra trabalho real.
  {
    id: "g-cliente-1",
    title: "Volume · resultado final",
    category: "Trabalho real",
    image: "/images/galeria/cliente-resultado-1.jpg",
  },
  {
    id: "g-cliente-2",
    title: "Aplicação em curso",
    category: "Trabalho real",
    image: "/images/galeria/cliente-aplicacao-1.jpg",
  },
  {
    id: "g1",
    title: "Trabalho AYAHA MAISON",
    category: "Volume",
    image: "/images/cilios-real-1.jpg",
  },
  {
    id: "g2",
    title: "Detalhe do olhar",
    category: "Efeitos",
    image: "/images/cilios-real-2.jpg",
  },
];
