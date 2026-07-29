/**
 * Vocabulário técnico de extensão de pestanas.
 *
 * Os valores vivem aqui, num módulo sem `"use client"`, porque tanto os
 * formulários (cliente) como as páginas e serviços (servidor) precisam deles.
 *
 * Unidades — escolhidas para nunca haver vírgula flutuante:
 *   - comprimento: milímetros inteiros (8 a 18)
 *   - espessura:   mícrones inteiros (0,15 mm = 150)
 */

import type {
  EyeShape,
  EyeSpacing,
  EyeTilt,
  FaceShape,
  LashCurl,
  Scale3,
  VisagismGoal,
} from "@prisma/client";

// ── Zonas do olho ────────────────────────────────────────────

/**
 * Quantas zonas tem o mapa. Cinco é o que a maioria das técnicas usa: chega
 * para desenhar um Fox Eye ou um Doll Eye sem transformar o preenchimento
 * numa folha de cálculo.
 */
// Tipado como `number` de propósito: assim as guardas contra divisão por zero
// continuam a fazer sentido para o TypeScript se este valor mudar.
export const ZONE_COUNT: number = 5;

export const ZONE_LABELS = [
  "Canto interno",
  "Interno-centro",
  "Centro",
  "Centro-externo",
  "Canto externo",
] as const;

/** Etiqueta curta para caber dentro do desenho. */
export const ZONE_SHORT = ["CI", "IC", "C", "CE", "CX"] as const;

export type EyeSide = "LEFT" | "RIGHT";

export const EYE_LABELS: Record<EyeSide, string> = {
  LEFT: "Olho esquerdo",
  RIGHT: "Olho direito",
};

// ── Comprimentos e espessuras ────────────────────────────────

/** Comprimentos disponíveis, em milímetros. */
export const LENGTHS_MM = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];

/** Espessuras, em mícrones. 150 = 0,15 mm. */
export const THICKNESSES_MICRONS = [30, 50, 70, 85, 100, 120, 150, 180, 200];

export function formatThickness(microns: number): string {
  // 150 → "0,15 mm". Divisão por 1000 com uma casa fixa evita "0.15000000002".
  return `${(microns / 1000).toFixed(2).replace(".", ",")} mm`;
}

export function formatLength(mm: number): string {
  return `${mm} mm`;
}

// ── Curvaturas ───────────────────────────────────────────────

export const CURLS: LashCurl[] = [
  "I",
  "B",
  "C",
  "CC",
  "D",
  "DD",
  "L",
  "LC",
  "LD",
  "M",
];

export const CURL_HINTS: Record<LashCurl, string> = {
  I: "Reta — efeito muito natural",
  B: "Suave — levanta pouco",
  C: "A mais usada — abre o olhar",
  CC: "Entre C e D",
  D: "Marcada — efeito lifting",
  DD: "Muito marcada",
  L: "Base reta com ponta curvada — olhos encapuzados",
  LC: "L com curvatura C",
  LD: "L com curvatura D",
  M: "Muito curvada — efeito dramático",
};

// ── Mappings conhecidos ──────────────────────────────────────

/**
 * Estilos com um ponto de partida sugerido: onde fica o comprimento máximo,
 * de 0 (canto interno) a 1 (canto externo). É o que distingue um Fox Eye de
 * um Doll Eye — e o que a interface usa para pré-preencher o desenho.
 */
export const MAPPING_PRESETS = [
  { name: "Natural", peak: 0.55, hint: "Segue a linha natural da pestana" },
  { name: "Wispy", peak: 0.6, hint: "Alterna comprimentos, efeito de picos" },
  { name: "Fox Eyes", peak: 1, hint: "Máximo no canto externo, olhar alongado" },
  { name: "Cat Eye", peak: 0.9, hint: "Sobe do interno ao externo" },
  { name: "Doll Eye", peak: 0.5, hint: "Máximo ao centro, olhar redondo" },
  { name: "Kim K", peak: 0.5, hint: "Picos regulares, base curta" },
  { name: "Eyeliner", peak: 0.85, hint: "Densidade forte na linha superior" },
  { name: "Squirrel", peak: 0.7, hint: "Máximo no terço externo, mais suave" },
  { name: "Open Eye", peak: 0.5, hint: "Abre o olhar, comprimentos médios" },
  { name: "Soft Cat Eye", peak: 0.8, hint: "Cat eye atenuado" },
  { name: "Anime", peak: 0.45, hint: "Picos longos e espaçados" },
  { name: "Wet Look", peak: 0.6, hint: "Leques fechados, aspeto molhado" },
] as const;

export type MappingPresetName = (typeof MAPPING_PRESETS)[number]["name"];

/**
 * Gera comprimentos sugeridos para um estilo.
 *
 * Curva em sino centrada no pico do estilo: o comprimento cresce até ao ponto
 * de destaque e decresce depois. É uma sugestão — a técnica ajusta zona a zona
 * no diagrama, que é onde a decisão real acontece.
 */
export function suggestLengths(
  peak: number,
  minMm: number,
  maxMm: number,
): number[] {
  const span = maxMm - minMm;

  return Array.from({ length: ZONE_COUNT }, (_, i) => {
    const position = ZONE_COUNT === 1 ? 0 : i / (ZONE_COUNT - 1);
    const distance = Math.abs(position - peak);
    // Queda linear a partir do pico, limitada para não descer abaixo do mínimo.
    const factor = Math.max(0, 1 - distance * 1.4);
    return Math.round(minMm + span * factor);
  });
}

// ── Etiquetas em português ───────────────────────────────────

export const EYE_SHAPE_LABELS: Record<EyeShape, string> = {
  ALMOND: "Amendoados",
  ROUND: "Redondos",
  HOODED: "Encapuzados",
  DOWNTURNED: "Caídos",
  UPTURNED: "Levantados",
  DEEP_SET: "Fundos",
  PROTRUDING: "Salientes",
  MONOLID: "Monopálpebra",
};

export const FACE_SHAPE_LABELS: Record<FaceShape, string> = {
  OVAL: "Oval",
  ROUND: "Redondo",
  SQUARE: "Quadrado",
  HEART: "Coração",
  DIAMOND: "Diamante",
  OBLONG: "Alongado",
};

export const EYE_SPACING_LABELS: Record<EyeSpacing, string> = {
  CLOSE_SET: "Juntos",
  AVERAGE: "Normais",
  WIDE_SET: "Afastados",
};

export const EYE_TILT_LABELS: Record<EyeTilt, string> = {
  UPTURNED: "Canto externo em cima",
  NEUTRAL: "Alinhados",
  DOWNTURNED: "Canto externo em baixo",
};

export const SCALE3_LABELS: Record<Scale3, string> = {
  LOW: "Baixa",
  MEDIUM: "Média",
  HIGH: "Alta",
};

export const GOAL_LABELS: Record<VisagismGoal, string> = {
  OPEN_EYE: "Abrir o olhar",
  ELONGATE: "Alongar os olhos",
  LIFT_OUTER: "Levantar canto externo",
  CORRECT_DOWNTURNED: "Corrigir olhos caídos",
  CORRECT_CLOSE_SET: "Corrigir olhos juntos",
  CORRECT_WIDE_SET: "Corrigir olhos afastados",
  SENSUAL: "Efeito sensual",
  NATURAL: "Efeito natural",
  GLAMOROUS: "Efeito glamouroso",
};

/**
 * Sugestões de visagismo — o que a técnica costuma fazer para cada objetivo.
 *
 * É apoio à decisão, não regra: a interface mostra isto ao lado do diagrama
 * para quem está a começar, mas quem decide é quem está a olhar para a cliente.
 */
export const GOAL_ADVICE: Record<VisagismGoal, string> = {
  OPEN_EYE: "Máximo ao centro, curvatura C ou D. Evitar comprimentos longos nos cantos.",
  ELONGATE: "Crescer para o canto externo. Curvatura B ou C, base mais reta.",
  LIFT_OUTER: "Pico no canto externo com curvatura D. Interno curto.",
  CORRECT_DOWNTURNED: "Curvatura L ou M no terço externo para contrariar a queda.",
  CORRECT_CLOSE_SET: "Comprimentos curtos no canto interno, crescendo para fora.",
  CORRECT_WIDE_SET: "Reforçar o canto interno, encurtar o externo.",
  SENSUAL: "Wispy ou Cat Eye, picos irregulares.",
  NATURAL: "Seguir a linha natural, variação suave de 1 mm entre zonas.",
  GLAMOROUS: "Volume mais denso, curvatura D, comprimentos generosos.",
};

// ── Regras de segurança ──────────────────────────────────────

/**
 * Comprimento máximo seguro para uma pestana natural.
 *
 * A regra da profissão: a extensão não deve exceder o dobro do comprimento
 * natural, nem pesar mais do que a pestana aguenta. Passar disto causa queda
 * prematura e, no limite, danifica o folículo.
 */
export function maxSafeLength(
  naturalLengthMm: number | null,
  strength: Scale3 | null,
): number | null {
  if (!naturalLengthMm) return null;

  const multiplier =
    strength === "HIGH" ? 2.2 : strength === "LOW" ? 1.5 : 1.8;

  return Math.floor(naturalLengthMm * multiplier);
}

/** Zonas que ultrapassam o comprimento seguro. Devolve as posições (1-based). */
export function unsafeZones(
  lengths: number[],
  maxSafe: number | null,
): number[] {
  if (!maxSafe) return [];
  return lengths
    .map((mm, i) => (mm > maxSafe ? i + 1 : 0))
    .filter((position) => position > 0);
}
