/**
 * Segmentos de marketing.
 *
 * Mesma filosofia dos painéis de retoque e de lembretes: LISTA DE TRABALHO,
 * não envio automático. A página mostra quem está em cada situação e a
 * profissional manda a mensagem, já escrita, com um clique.
 *
 * ─────────────────────────────────────────────────────────────
 * PORQUE NÃO HÁ ENVIO EM MASSA
 * ─────────────────────────────────────────────────────────────
 * Mandar a mesma mensagem a 40 pessoas de uma vez pelo WhatsApp exige a API
 * da Meta: conta de empresa verificada, modelos de mensagem aprovados um a
 * um, e custo por conversa. Nada disso existe hoje neste negócio, e fingir
 * que existe seria construir um botão que não funciona.
 *
 * Uma mensagem individual, escrita pela profissional para a sua cliente, é
 * outra coisa — juridicamente e na prática. É o que isto faz.
 *
 * ─────────────────────────────────────────────────────────────
 * CONSENTIMENTO
 * ─────────────────────────────────────────────────────────────
 * Isto é diferente do painel de retoques. Lembrar alguém de que os cílios
 * precisam de manutenção é continuidade do serviço que ela contratou. Já
 * mandar parabéns com uma promoção, ou tentar recuperar quem desapareceu, é
 * marketing — e para isso o RGPD pede consentimento.
 *
 * A ficha da cliente já tem `marketingOptIn`. Estas listas só incluem quem o
 * tem. Quem não tem é contado à parte e mostrado como número, para a
 * fundadora perceber que a lista é mais curta por uma razão — e não por
 * estar avariada.
 */

import type { Prisma } from "@prisma/client";
import { prisma } from "@/server/db";
import { type Actor, can, clientScope } from "@/server/permissions";

/** Sem voltar há mais de isto: já não é atraso, é afastamento. */
const EM_RISCO_DIAS = 45;
/** A partir daqui considera-se que deixou de ser cliente. */
const ADORMECIDA_DIAS = 90;
/** Janela para apanhar quem veio a primeira vez e ainda não voltou. */
const PRIMEIRA_VISITA_DIAS = 60;

export type SegmentKey =
  | "aniversariantes"
  | "em-risco"
  | "adormecidas"
  | "primeira-visita";

export interface SegmentClient {
  clientId: string;
  firstName: string;
  lastName: string | null;
  phone: string;
  lastVisitAt: Date | null;
  birthDate: Date | null;
  visitCount: number;
  /** Dias desde a última visita. `null` se nunca veio. */
  daysSince: number | null;
}

export interface Segment {
  key: SegmentKey;
  title: string;
  /** O que este segmento é, em linguagem de negócio. */
  description: string;
  /** Contactáveis: estão no segmento E têm consentimento. */
  clients: SegmentClient[];
  /** Estão no segmento mas ficaram de fora por falta de consentimento. */
  withoutConsent: number;
}

/** Campos que todas as consultas abaixo precisam. */
const SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  phone: true,
  lastVisitAt: true,
  birthDate: true,
  visitCount: true,
  marketingOptIn: true,
} as const;

type Row = {
  id: string;
  firstName: string;
  lastName: string | null;
  phone: string;
  lastVisitAt: Date | null;
  birthDate: Date | null;
  visitCount: number;
  marketingOptIn: boolean;
};

function toSegmentClient(c: Row, now: number): SegmentClient {
  return {
    clientId: c.id,
    firstName: c.firstName,
    lastName: c.lastName,
    phone: c.phone,
    lastVisitAt: c.lastVisitAt,
    birthDate: c.birthDate,
    visitCount: c.visitCount,
    daysSince: c.lastVisitAt
      ? Math.floor((now - c.lastVisitAt.getTime()) / 86_400_000)
      : null,
  };
}

/** Separa quem pode ser contactado de quem não deu consentimento. */
function split(rows: Row[], now: number) {
  const comConsentimento = rows.filter((c) => c.marketingOptIn);
  return {
    clients: comConsentimento.map((c) => toSegmentClient(c, now)),
    withoutConsent: rows.length - comConsentimento.length,
  };
}

export async function listSegments(actor: Actor): Promise<Segment[]> {
  if (!can(actor, "marketing:read")) return [];

  const now = Date.now();
  const scope = clientScope(actor);
  const base: Prisma.ClientWhereInput = {
    ...scope,
    status: { notIn: ["BLOCKED"] },
  };

  const emRiscoDe = new Date(now - ADORMECIDA_DIAS * 86_400_000);
  const emRiscoAte = new Date(now - EM_RISCO_DIAS * 86_400_000);
  const adormecidaAte = new Date(now - ADORMECIDA_DIAS * 86_400_000);
  const primeiraVisitaDe = new Date(now - PRIMEIRA_VISITA_DIAS * 86_400_000);

  /** Já tem a próxima marcada — não precisa de ser recuperada. */
  const semProximaMarcacao: Prisma.ClientWhereInput = {
    appointments: {
      none: {
        deletedAt: null,
        startAt: { gte: new Date() },
        status: { notIn: ["CANCELLED", "NO_SHOW"] },
      },
    },
  };

  const [aniversariantesRaw, emRisco, adormecidas, primeiraVisita] =
    await Promise.all([
      // O Prisma não filtra por mês de uma data sem SQL cru. Numa casa com
      // dezenas de clientes, trazer quem tem data de nascimento e filtrar
      // aqui é mais simples de ler e mais fácil de manter — e a diferença
      // de custo não se mede.
      prisma.client.findMany({
        where: { ...base, birthDate: { not: null } },
        select: SELECT,
      }),
      prisma.client.findMany({
        where: {
          ...base,
          ...semProximaMarcacao,
          lastVisitAt: { lte: emRiscoAte, gte: emRiscoDe },
        },
        orderBy: { lastVisitAt: "asc" },
        select: SELECT,
      }),
      prisma.client.findMany({
        where: {
          ...base,
          ...semProximaMarcacao,
          lastVisitAt: { lt: adormecidaAte },
        },
        orderBy: { lastVisitAt: "asc" },
        select: SELECT,
      }),
      prisma.client.findMany({
        where: {
          ...base,
          ...semProximaMarcacao,
          visitCount: 1,
          lastVisitAt: { gte: primeiraVisitaDe },
        },
        orderBy: { lastVisitAt: "desc" },
        select: SELECT,
      }),
    ]);

  const mesAtual = new Date().getMonth();
  const aniversariantes = aniversariantesRaw
    .filter((c) => c.birthDate!.getMonth() === mesAtual)
    .sort((a, b) => a.birthDate!.getDate() - b.birthDate!.getDate());

  return [
    {
      key: "aniversariantes",
      title: "Aniversariantes deste mês",
      description:
        "Uma mensagem no dia certo é o contacto com mais resposta do ano — e não precisa de desconto para funcionar.",
      ...split(aniversariantes, now),
    },
    {
      key: "em-risco",
      title: "Em risco",
      description: `Entre ${EM_RISCO_DIAS} e ${ADORMECIDA_DIAS} dias sem voltar, e sem próxima marcação. Ainda dá para recuperar — passado isto, raramente.`,
      ...split(emRisco, now),
    },
    {
      key: "adormecidas",
      title: "Adormecidas",
      description: `Mais de ${ADORMECIDA_DIAS} dias sem aparecer. Uma mensagem honesta, sem insistência, é o que resta a tentar.`,
      ...split(adormecidas, now),
    },
    {
      key: "primeira-visita",
      title: "Vieram uma vez e não voltaram",
      description:
        "A segunda visita é a que transforma uma experiência em hábito. É também de quem gostou que vêm os primeiros depoimentos para o site.",
      ...split(primeiraVisita, now),
    },
  ];
}
