/**
 * Dados do site público — sem autenticação, sem `Actor`.
 *
 * Deliberadamente à parte de `services/service.service.ts`: aquele exige um
 * `Actor` e aplica permissões de equipa, porque serve o painel interno. Isto
 * aqui serve visitantes anónimos, e só pode ler o que já está marcado como
 * público (`isActive`) — nunca custos, nunca dados de outra cliente.
 */

import { prisma } from "./db";

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
  "https://images.unsplash.com/photo-1522337660859-02fbefca4702?auto=format&fit=crop&w=1200&q=80";

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
  const unitId = await getUnitId();
  const services = await prisma.service.findMany({
    where: { unitId, isActive: true, deletedAt: null },
    orderBy: { sortOrder: "asc" },
  });
  return services.map(toPublicService);
}

export async function getPublicServiceBySlug(
  slug: string,
): Promise<PublicService | null> {
  const unitId = await getUnitId();
  const service = await prisma.service.findFirst({
    where: { unitId, slug, isActive: true, deletedAt: null },
  });
  return service ? toPublicService(service) : null;
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

export const TESTIMONIALS: Testimonial[] = [
  {
    id: "t1",
    name: "Marina Aguiar",
    rating: 5,
    text: "Simplesmente perfeito. O atendimento é impecável e os meus cílios ficaram exatamente como sonhava. Ambiente luxuoso e acolhedor.",
    service: "Volume Russo",
  },
  {
    id: "t2",
    name: "Beatriz Lopes",
    rating: 5,
    text: "A AYAHA MAISON elevou o padrão. Profissionalismo, higiene e um resultado que dura semanas. Recomendo de olhos fechados.",
    service: "Fox Eyes",
  },
  {
    id: "t3",
    name: "Camila Ferraz",
    rating: 5,
    text: "Senti-me numa maison de luxo em Paris. Cada detalhe pensado. Já sou cliente fiel e adoro o programa de fidelidade!",
    service: "Volume Brasileiro",
  },
  {
    id: "t4",
    name: "Isabela Nunes",
    rating: 5,
    text: "O efeito Gatinho deixou o meu olhar desperto sem parecer artificial. Naturalidade e sofisticação na medida certa.",
    service: "Efeito Gatinho",
  },
];

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
  {
    id: "g-cliente-video-1",
    title: "Resultado em vídeo",
    category: "Trabalho real",
    image: "/images/galeria/cliente-video-capa.jpg",
    video: "/videos/cliente-resultado-1.mp4",
  },
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
  {
    id: "g3",
    title: "Clássico Natural",
    category: "Clássico",
    image:
      "https://images.unsplash.com/photo-1548902378-2ec44c906391?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "g4",
    title: "Olhar Marcante",
    category: "Volume",
    image:
      "https://images.unsplash.com/photo-1633346152343-5486573d3d50?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "g5",
    title: "Efeito Esquilo",
    category: "Efeitos",
    image:
      "https://images.unsplash.com/photo-1590556409324-aa1d726e5c3c?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "g6",
    title: "Detalhe do acabamento",
    category: "Efeitos",
    image:
      "https://images.unsplash.com/photo-1633276115947-8d35f394a309?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "g7",
    title: "Aplicação em detalhe",
    category: "Processo",
    image:
      "https://images.unsplash.com/photo-1674049406467-824ea37c7184?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "g8",
    title: "Experiência premium",
    category: "Efeitos",
    image:
      "https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?auto=format&fit=crop&w=800&q=80",
  },
];
