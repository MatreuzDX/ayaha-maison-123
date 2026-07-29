/**
 * Ficha técnica de pestanas: análise natural, visagismo e mappings.
 *
 * É a parte do sistema que substitui a ficha de papel. O que a distingue do
 * resto: aqui o valor não está em cada registo isolado, mas na comparação —
 * saber que o Fox Eye com curvatura D teve retenção 5 e o Wet Look teve 2 é o
 * que faz a técnica melhorar.
 */

import type { LashCurl, Prisma } from "@prisma/client";
import { prisma } from "@/server/db";
import { recordAudit } from "@/server/audit";
import { recordTimeline } from "@/server/timeline";
import { NotFoundError, ValidationError } from "@/server/errors";
import {
  type Actor,
  assertCan,
  assertOwns,
  clientScope,
} from "@/server/permissions";
import { LENGTHS_MM, ZONE_COUNT, maxSafeLength } from "@/lib/lash";

const MIN_LENGTH = LENGTHS_MM[0]!;
const MAX_LENGTH = LENGTHS_MM[LENGTHS_MM.length - 1]!;

export interface ZoneInput {
  eye: "LEFT" | "RIGHT";
  position: number;
  lengthMm: number;
  curl?: LashCurl | null;
  thicknessMicrons?: number | null;
}

export interface MappingInput {
  clientId: string;
  appointmentId?: string | null;
  name: string;
  curl?: LashCurl | null;
  thicknessMicrons?: number | null;
  fanType?: string | null;
  fansPerEye?: number | null;
  glueBrand?: string | null;
  lashBrand?: string | null;
  removerBrand?: string | null;
  primerBrand?: string | null;
  otherProducts?: string | null;
  applicationMin?: number | null;
  recommendedProducts?: string | null;
  notes?: string | null;
  appliedAt?: Date;
  zones: ZoneInput[];
}

/**
 * Confirma que o actor pode ver esta cliente antes de tocar na ficha técnica.
 *
 * A ficha técnica é tão sensível como a ficha da cliente — diz onde ela mora
 * na agenda, que alergias tem e o que já lhe foi aplicado. Sem esta
 * verificação, bastava saber o ID para ler tudo.
 */
async function assertClientVisible(actor: Actor, clientId: string) {
  const scope = clientScope(actor);
  const client = await prisma.client.findFirst({
    where: { ...scope, id: clientId },
    select: { id: true, ownerProfessionalId: true },
  });
  if (!client) throw new NotFoundError("Cliente");
  return client;
}

// ── Análise natural e visagismo ──────────────────────────────

export async function getLashProfile(actor: Actor, clientId: string) {
  await assertClientVisible(actor, clientId);

  return prisma.lashProfile.findUnique({ where: { clientId } });
}

export type LashProfileInput = Omit<
  Prisma.LashProfileUncheckedCreateInput,
  "id" | "clientId" | "createdAt" | "updatedAt" | "lastReviewedById"
>;

export async function saveLashProfile(
  actor: Actor,
  clientId: string,
  input: LashProfileInput,
) {
  assertCan(actor, "client:update");
  const client = await assertClientVisible(actor, clientId);
  assertOwns(actor, "client:update", client.ownerProfessionalId);

  if (
    input.naturalLengthMm != null &&
    (input.naturalLengthMm < 1 || input.naturalLengthMm > 20)
  ) {
    throw new ValidationError(
      "O comprimento natural tem de estar entre 1 e 20 mm.",
    );
  }

  const data = {
    ...input,
    lastReviewedAt: new Date(),
    lastReviewedById: actor.userId,
  };

  return prisma.$transaction(async (tx) => {
    const before = await tx.lashProfile.findUnique({ where: { clientId } });

    const saved = await tx.lashProfile.upsert({
      where: { clientId },
      create: { ...data, clientId },
      update: data,
    });

    await recordAudit(tx, actor, {
      action: before ? "UPDATE" : "CREATE",
      entityType: "LashProfile",
      entityId: saved.id,
      before,
      after: saved,
    });

    return saved;
  });
}

// ── Mappings ─────────────────────────────────────────────────

export async function listMappings(actor: Actor, clientId: string) {
  await assertClientVisible(actor, clientId);

  return prisma.mapping.findMany({
    where: { clientId, deletedAt: null },
    orderBy: { appliedAt: "desc" },
    include: {
      zones: { orderBy: [{ eye: "asc" }, { position: "asc" }] },
      appointment: { select: { code: true, startAt: true } },
    },
  });
}

export async function getMapping(actor: Actor, mappingId: string) {
  const mapping = await prisma.mapping.findFirst({
    where: { id: mappingId, unitId: actor.unitId, deletedAt: null },
    include: {
      zones: { orderBy: [{ eye: "asc" }, { position: "asc" }] },
      client: { select: { id: true, firstName: true, lastName: true } },
    },
  });
  if (!mapping) throw new NotFoundError("Mapping");

  await assertClientVisible(actor, mapping.clientId);
  return mapping;
}

function validateZones(zones: ZoneInput[]) {
  if (zones.length === 0) {
    throw new ValidationError("Indique os comprimentos no diagrama do olho.");
  }

  for (const zone of zones) {
    if (!Number.isInteger(zone.lengthMm)) {
      throw new ValidationError(
        "Os comprimentos têm de ser milímetros inteiros.",
      );
    }
    if (zone.lengthMm < MIN_LENGTH || zone.lengthMm > MAX_LENGTH) {
      throw new ValidationError(
        `Comprimento fora do intervalo: ${zone.lengthMm} mm. Use entre ${MIN_LENGTH} e ${MAX_LENGTH} mm.`,
      );
    }
    if (zone.position < 1 || zone.position > ZONE_COUNT) {
      throw new ValidationError(
        `Zona inválida: ${zone.position}. O diagrama tem ${ZONE_COUNT} zonas.`,
      );
    }
  }

  // Duas entradas para a mesma zona do mesmo olho significa que a interface
  // enviou dados inconsistentes — gravar as duas deixaria a ficha ambígua.
  const seen = new Set<string>();
  for (const zone of zones) {
    const key = `${zone.eye}:${zone.position}`;
    if (seen.has(key)) {
      throw new ValidationError(
        "A mesma zona aparece duas vezes no diagrama.",
      );
    }
    seen.add(key);
  }
}

/**
 * Grava um mapping.
 *
 * Não impede comprimentos acima do limite seguro — avisa. Quem está a olhar
 * para a cliente sabe coisas que a ficha não sabe, e um sistema que bloqueia
 * decisões clínicas acaba por ser contornado com dados falsos.
 */
export async function createMapping(actor: Actor, input: MappingInput) {
  assertCan(actor, "client:update");
  const client = await assertClientVisible(actor, input.clientId);
  assertOwns(actor, "client:update", client.ownerProfessionalId);

  const name = input.name?.trim();
  if (!name) throw new ValidationError("Dê um nome ao mapping.");

  validateZones(input.zones);

  if (
    input.applicationMin != null &&
    (input.applicationMin < 0 || input.applicationMin > 600)
  ) {
    throw new ValidationError(
      "O tempo de aplicação tem de estar entre 0 e 600 minutos.",
    );
  }

  const profile = await prisma.lashProfile.findUnique({
    where: { clientId: input.clientId },
    select: { naturalLengthMm: true, lashStrength: true },
  });
  const safeLimit = maxSafeLength(
    profile?.naturalLengthMm ?? null,
    profile?.lashStrength ?? null,
  );
  const exceeded = safeLimit
    ? input.zones.filter((z) => z.lengthMm > safeLimit).length
    : 0;

  const mapping = await prisma.$transaction(async (tx) => {
    const created = await tx.mapping.create({
      data: {
        unitId: actor.unitId,
        clientId: input.clientId,
        appointmentId: input.appointmentId ?? null,
        name,
        curl: input.curl ?? null,
        thicknessMicrons: input.thicknessMicrons ?? null,
        fanType: input.fanType?.trim() || null,
        fansPerEye: input.fansPerEye ?? null,
        glueBrand: input.glueBrand?.trim() || null,
        lashBrand: input.lashBrand?.trim() || null,
        removerBrand: input.removerBrand?.trim() || null,
        primerBrand: input.primerBrand?.trim() || null,
        otherProducts: input.otherProducts?.trim() || null,
        applicationMin: input.applicationMin ?? null,
        recommendedProducts: input.recommendedProducts?.trim() || null,
        notes: input.notes?.trim() || null,
        appliedAt: input.appliedAt ?? new Date(),
        zones: {
          create: input.zones.map((zone) => ({
            eye: zone.eye,
            position: zone.position,
            lengthMm: zone.lengthMm,
            curl: zone.curl ?? null,
            thicknessMicrons: zone.thicknessMicrons ?? null,
          })),
        },
      },
      include: { zones: true },
    });

    await recordAudit(tx, actor, {
      action: "CREATE",
      entityType: "Mapping",
      entityId: created.id,
      after: created,
    });

    await recordTimeline(tx, actor, {
      clientId: input.clientId,
      entityType: "Mapping",
      entityId: created.id,
      type: "NOTE_ADDED",
      title: `Mapping ${name}`,
      body: describeMapping(created.zones.map((z) => z.lengthMm)),
      occurredAt: created.appliedAt,
    });

    return created;
  });

  return { mapping, safeLimit, exceeded };
}

/** Resumo legível dos comprimentos, para a linha do tempo. */
function describeMapping(lengths: number[]): string {
  if (lengths.length === 0) return "";
  const min = Math.min(...lengths);
  const max = Math.max(...lengths);
  return min === max ? `${min} mm` : `${min}–${max} mm`;
}

/**
 * Regista a retenção de um mapping, na visita seguinte.
 *
 * É a informação mais valiosa da ficha e a mais fácil de perder: só se sabe
 * como correu quando a cliente volta, três semanas depois.
 */
export async function rateRetention(
  actor: Actor,
  mappingId: string,
  stars: number,
  note?: string,
) {
  assertCan(actor, "client:update");

  if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
    throw new ValidationError("A retenção vai de 1 a 5 estrelas.");
  }

  const mapping = await prisma.mapping.findFirst({
    where: { id: mappingId, unitId: actor.unitId, deletedAt: null },
  });
  if (!mapping) throw new NotFoundError("Mapping");
  await assertClientVisible(actor, mapping.clientId);

  return prisma.$transaction(async (tx) => {
    const updated = await tx.mapping.update({
      where: { id: mappingId },
      data: { retentionStars: stars, retentionNote: note?.trim() || null },
    });

    await recordAudit(tx, actor, {
      action: "UPDATE",
      entityType: "Mapping",
      entityId: mappingId,
      before: { retentionStars: mapping.retentionStars },
      after: { retentionStars: stars },
    });

    return updated;
  });
}

/**
 * Duplica um mapping para uma nova aplicação.
 *
 * O caso mais comum na cadeira: a cliente gostou e quer o mesmo. Copiar
 * incluindo as zonas poupa reconstruir o diagrama de raiz — e a retenção
 * fica por preencher, porque é uma aplicação nova.
 */
export async function duplicateMapping(actor: Actor, mappingId: string) {
  const source = await getMapping(actor, mappingId);

  return createMapping(actor, {
    clientId: source.clientId,
    name: source.name,
    curl: source.curl,
    thicknessMicrons: source.thicknessMicrons,
    fanType: source.fanType,
    fansPerEye: source.fansPerEye,
    glueBrand: source.glueBrand,
    lashBrand: source.lashBrand,
    removerBrand: source.removerBrand,
    primerBrand: source.primerBrand,
    otherProducts: source.otherProducts,
    applicationMin: source.applicationMin,
    recommendedProducts: source.recommendedProducts,
    notes: source.notes,
    appliedAt: new Date(),
    zones: source.zones.map((zone) => ({
      eye: zone.eye as "LEFT" | "RIGHT",
      position: zone.position,
      lengthMm: zone.lengthMm,
      curl: zone.curl,
      thicknessMicrons: zone.thicknessMicrons,
    })),
  });
}

// ── Estatísticas ─────────────────────────────────────────────

/**
 * O que se usa mais e o que resulta melhor.
 *
 * A média de retenção por estilo é o número que justifica este módulo todo:
 * mostra, com dados da própria casa, que mapping vale a pena repetir.
 */
export async function mappingStats(actor: Actor) {
  assertCan(actor, "report:read");

  const mappings = await prisma.mapping.findMany({
    where: { unitId: actor.unitId, deletedAt: null },
    select: {
      name: true,
      curl: true,
      retentionStars: true,
      zones: { select: { lengthMm: true } },
    },
  });

  if (mappings.length === 0) {
    return { total: 0, byName: [], topCurl: null, topLength: null };
  }

  const byName = new Map<string, { count: number; stars: number[] }>();
  const curlCount = new Map<string, number>();
  const lengthCount = new Map<number, number>();

  for (const mapping of mappings) {
    const entry = byName.get(mapping.name) ?? { count: 0, stars: [] };
    entry.count++;
    if (mapping.retentionStars) entry.stars.push(mapping.retentionStars);
    byName.set(mapping.name, entry);

    if (mapping.curl) {
      curlCount.set(mapping.curl, (curlCount.get(mapping.curl) ?? 0) + 1);
    }
    for (const zone of mapping.zones) {
      lengthCount.set(zone.lengthMm, (lengthCount.get(zone.lengthMm) ?? 0) + 1);
    }
  }

  const top = <K,>(map: Map<K, number>): K | null => {
    let best: K | null = null;
    let bestCount = 0;
    for (const [key, count] of map) {
      if (count > bestCount) {
        best = key;
        bestCount = count;
      }
    }
    return best;
  };

  return {
    total: mappings.length,
    byName: [...byName.entries()]
      .map(([name, { count, stars }]) => ({
        name,
        count,
        avgRetention: stars.length
          ? Math.round((stars.reduce((a, b) => a + b, 0) / stars.length) * 10) / 10
          : null,
        rated: stars.length,
      }))
      .sort((a, b) => b.count - a.count),
    topCurl: top(curlCount),
    topLength: top(lengthCount),
  };
}
