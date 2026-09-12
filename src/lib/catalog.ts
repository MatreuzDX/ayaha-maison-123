/**
 * Catálogo base da AYAHA MAISON — a fonte única do que o negócio oferece.
 *
 * Usado em dois sítios, e é por isso que existe:
 *
 * 1. `prisma/seed.ts` grava isto num banco novo (e preenche os campos
 *    públicos que estejam vazios num banco antigo).
 * 2. `src/server/public-content.ts` mostra isto quando o banco não responde,
 *    para o site público nunca cair num ecrã de erro por falta de banco.
 *
 * Com uma só fonte, o site sem banco mostra exatamente o que o banco teria
 * logo a seguir ao seed. Depois disso manda o CRM: preços e textos editados
 * pela equipa ficam no banco e têm prioridade sempre que ele responde.
 *
 * Os textos, destaques e fotos vieram de `scripts/preencher-catalogo-publico.mjs`,
 * que corria à mão e por isso nunca chegava a um banco novo.
 */

/** €30 — igual em todos os serviços. Não é erro: é decisão de negócio. */
export const SERVICE_PRICE_CENTS = 3000;

export interface CatalogService {
  name: string;
  slug: string;
  durationMin: number;
  tagline: string;
  displayCategory: string;
  imageUrl: string;
  highlights: readonly string[];
  longDescription: readonly string[];
}

// Confirmado pela fundadora em 2026-07-27. A ordem é a ordem no site.
export const CATALOG_SERVICES: readonly CatalogService[] = [
  {
    name: "Fio a Fio",
    slug: "fio-a-fio",
    durationMin: 90,
    tagline: "O clássico. Um fio por cada cílio natural.",
    displayCategory: "Clássico",
    imageUrl:
      "/images/cilios-real-1.jpg",
    highlights: ["Efeito natural", "Leveza total", "Ideal para iniciantes"],
    longDescription: [
      "A técnica fio a fio é ideal para quem busca um resultado natural, como se fosse rímel bem aplicado.",
      "Perfeito para o dia a dia, com acabamento leve e sofisticado — tudo no conforto da sua casa.",
    ],
  },
  {
    name: "Volume Brasileiro",
    slug: "volume-brasileiro",
    durationMin: 120,
    tagline: "Volume natural e leve, efeito preenchido.",
    displayCategory: "Volume",
    imageUrl:
      "/images/galeria/cliente-resultado-1.jpg",
    highlights: ["Fios em Y", "Efeito preenchido", "Baixa manutenção"],
    longDescription: [
      "O Volume Brasileiro utiliza fios pré-montados em Y, criando um efeito de destaque com aparência preenchida e uniforme.",
      "Excelente relação entre volume, durabilidade e conforto.",
    ],
  },
  {
    name: "Volume Russo",
    slug: "volume-russo",
    durationMin: 120,
    tagline: "Máximo volume, leques finos e densos.",
    displayCategory: "Volume",
    imageUrl:
      "/images/cilios-real-2.jpg",
    highlights: ["Fios 0.05mm", "Leques 4D a 6D", "Duração até 4 semanas"],
    longDescription: [
      "O Volume Russo é uma assinatura da AYAHA MAISON. Aplicamos leques feitos à mão com fios ultraleves, respeitando a saúde do cílio natural.",
      "O resultado é um olhar preenchido, elegante e personalizado de acordo com o formato dos seus olhos.",
    ],
  },
  {
    name: "Volume Egípcio",
    slug: "volume-egipcio",
    durationMin: 120,
    tagline: "Efeito dramático com desenho marcado.",
    displayCategory: "Volume",
    imageUrl:
      "/images/galeria/cliente-aplicacao-1.jpg",
    highlights: ["Efeito alongado", "Densidade elegante", "Mapping personalizado"],
    longDescription: [
      "O Volume Egípcio combina densidade e alongamento, com um desenho que aprofunda e estica o olhar.",
      "Um efeito sofisticado e marcante, mantendo leveza graças aos fios de baixa espessura.",
    ],
  },
  {
    name: "Fox Eyes",
    slug: "fox-eyes",
    durationMin: 120,
    tagline: "Olhar alongado e elevado nas pontas.",
    displayCategory: "Efeitos",
    imageUrl:
      "/images/cilios-real-2.jpg",
    highlights: ["Mapping personalizado", "Efeito lifting", "Ar felino"],
    longDescription: [
      "O efeito Fox Eyes cria um alongamento estratégico no canto externo dos olhos, para um olhar mais puxado e sofisticado.",
      "Trabalhamos o mapping de forma personalizada para valorizar a sua expressão natural.",
    ],
  },
  {
    name: "Efeito Gatinho",
    slug: "efeito-gatinho",
    durationMin: 90,
    tagline: "Cantos externos alongados, olhar felino.",
    displayCategory: "Efeitos",
    imageUrl:
      "/images/cilios-real-1.jpg",
    highlights: ["Olhar levantado", "Efeito charmoso", "Acabamento delicado"],
    longDescription: [
      "O efeito Gatinho realça o canto externo dos olhos, criando um olhar levantado, doce e sedutor.",
      "Ideal para quem quer um toque marcante sem perder a naturalidade.",
    ],
  },
  {
    name: "Efeito Esquilo",
    slug: "efeito-esquilo",
    durationMin: 90,
    tagline: "Elevação no terço médio, olhar aberto.",
    displayCategory: "Efeitos",
    imageUrl:
      "/images/galeria/cliente-resultado-1.jpg",
    highlights: ["Efeito penteado", "Textura marcante", "Volume moderno"],
    longDescription: [
      "O efeito Esquilo brinca com a direção dos fios, com um pico texturizado que dá volume e movimento ao olhar.",
      "Um look moderno e cheio, muito procurado por quem gosta de tendências.",
    ],
  },
];

// ── AYAHA Club ────────────────────────────────────────────────
// Cartão de 5 carimbos, 1 por atendimento concluído. Não é um sistema de
// pontos (ver AGENTS.md).

export const LOYALTY_PROGRAM = {
  name: "AYAHA Club",
  stampsRequired: 5,
  autoRestart: true,
  rewardValidDays: 180,
  termsText:
    "A cada atendimento concluído recebe 1 carimbo. Ao completar 5 carimbos " +
    "escolhe uma de três recompensas. O cartão recomeça depois do resgate.",
} as const;

export const LOYALTY_REWARDS = [
  { name: "Desconto de €15", description: "€15 de desconto no próximo atendimento.", kind: "DISCOUNT_FIXED", valueCents: 1500 },
  // ⚠️ Sem valor económico com preço único de €30 — ver spec 18.1 e Anexo A ponto 9.
  { name: "Upgrade de técnica", description: "Upgrade de técnica gratuito no próximo atendimento.", kind: "SERVICE_UPGRADE", valueCents: 0 },
  { name: "Gift Card de €15", description: "Gift card de €15 para oferecer a uma amiga.", kind: "GIFT_CARD", valueCents: 1500 },
] as const;
