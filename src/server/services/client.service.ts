/**
 * Serviço de clientes. Ver especificação secção 9.
 *
 * Toda a lógica de negócio sobre clientes vive aqui. As páginas e as Server
 * Actions validam o input, chamam estas funções e formatam o resultado — não
 * tocam no Prisma diretamente.
 *
 * Três regras que este ficheiro impõe sem exceção:
 *   1. Nenhuma query sai sem passar por `clientScope()` — é o que impede uma
 *      profissional de ver a carteira das colegas.
 *   2. Toda a escrita grava `AuditLog` na mesma transação.
 *   3. O telefone é a chave prática de deduplicação. Duas fichas com o mesmo
 *      número são quase sempre a mesma pessoa marcada duas vezes à pressa.
 */

import type { ClientStatus, Prisma } from "@prisma/client";
import { prisma } from "@/server/db";
import { diffFields, recordAudit } from "@/server/audit";
import { recordTimeline } from "@/server/timeline";
import { ConflictError, NotFoundError, ValidationError } from "@/server/errors";
import {
  type Actor,
  assertCan,
  assertOwns,
  clientScope,
} from "@/server/permissions";
import {
  isValidPostalCode,
  normalizePhone,
  normalizePostalCode,
  postalPrefix,
} from "@/lib/format";

/** Dias sem voltar a partir dos quais uma cliente entra em risco / adormece. */
const AT_RISK_DAYS = 45;
const DORMANT_DAYS = 90;

export interface ClientFilters {
  search?: string;
  status?: ClientStatus;
  travelZoneId?: string;
  professionalId?: string;
  page?: number;
  perPage?: number;
}

export interface ClientInput {
  firstName: string;
  lastName?: string | null;
  phone: string;
  email?: string | null;
  addressLine?: string | null;
  addressExtra?: string | null;
  postalCode?: string | null;
  city?: string | null;
  accessNotes?: string | null;
  parkingNotes?: string | null;
  status?: ClientStatus;
  source?: Client["source"];
  ownerProfessionalId?: string | null;
  notes?: string | null;
  marketingOptIn?: boolean;
}

type Client = Prisma.ClientGetPayload<Record<string, never>>;

const MAX_PER_PAGE = 100;

// ── Validação ────────────────────────────────────────────────

/**
 * Valida e normaliza o input, devolvendo já os campos prontos para gravar.
 * Falha cedo com mensagens que dizem o que corrigir, não só o que está mal.
 */
function normalizeInput(input: ClientInput) {
  const firstName = input.firstName?.trim();
  if (!firstName) {
    throw new ValidationError("Indique o primeiro nome da cliente.");
  }

  const phone = normalizePhone(input.phone ?? "");
  if (!phone) {
    throw new ValidationError(
      "Telefone inválido. Escreva um número português (933 055 502) ou internacional (+34 600 000 000).",
    );
  }

  const email = input.email?.trim() || null;
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    throw new ValidationError("E-mail inválido.");
  }

  let postalCode: string | null = null;
  if (input.postalCode?.trim()) {
    if (!isValidPostalCode(input.postalCode)) {
      throw new ValidationError(
        "Código postal inválido. Use o formato 1500-123.",
      );
    }
    postalCode = normalizePostalCode(input.postalCode);
  }

  return {
    firstName,
    lastName: input.lastName?.trim() || null,
    phone,
    email,
    addressLine: input.addressLine?.trim() || null,
    addressExtra: input.addressExtra?.trim() || null,
    postalCode,
    city: input.city?.trim() || "Lisboa",
    accessNotes: input.accessNotes?.trim() || null,
    parkingNotes: input.parkingNotes?.trim() || null,
    notes: input.notes?.trim() || null,
  };
}

/**
 * Descobre a zona de deslocação a partir do código postal.
 *
 * A zona determina a taxa de deslocação, por isso é preenchida logo na criação
 * da ficha — não à hora de marcar, quando já é tarde para a cliente saber
 * quanto vai pagar.
 */
async function resolveTravelZone(
  unitId: string,
  postalCode: string | null,
): Promise<string | null> {
  if (!postalCode) return null;
  const prefix = postalPrefix(postalCode);
  if (!prefix) return null;

  const zone = await prisma.travelZone.findFirst({
    where: { unitId, isActive: true, postalPrefixes: { has: prefix } },
    select: { id: true },
  });
  return zone?.id ?? null;
}

// ── Leitura ──────────────────────────────────────────────────

export async function listClients(actor: Actor, filters: ClientFilters = {}) {
  const scope = clientScope(actor);

  const page = Math.max(1, filters.page ?? 1);
  const perPage = Math.min(MAX_PER_PAGE, Math.max(1, filters.perPage ?? 25));

  const where: Prisma.ClientWhereInput = { ...scope };

  if (filters.status) where.status = filters.status;
  if (filters.travelZoneId) where.travelZoneId = filters.travelZoneId;
  if (filters.professionalId) {
    where.ownerProfessionalId = filters.professionalId;
  }

  const search = filters.search?.trim();
  if (search) {
    // O telefone é procurado em bruto porque está guardado em E.164 — quem
    // escreve "933 055" não encontraria nada numa comparação literal.
    const digits = search.replace(/\D/g, "");
    where.AND = [
      {
        OR: [
          { firstName: { contains: search, mode: "insensitive" } },
          { lastName: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
          ...(digits.length >= 3 ? [{ phone: { contains: digits } }] : []),
        ],
      },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.client.findMany({
      where,
      orderBy: [
        { lastVisitAt: { sort: "desc", nulls: "last" } },
        { firstName: "asc" },
      ],
      skip: (page - 1) * perPage,
      take: perPage,
      include: {
        travelZone: { select: { id: true, name: true, feeCents: true } },
        ownerProfessional: {
          select: { id: true, displayName: true, color: true },
        },
      },
    }),
    prisma.client.count({ where }),
  ]);

  return {
    items,
    total,
    page,
    perPage,
    totalPages: Math.max(1, Math.ceil(total / perPage)),
  };
}

/**
 * Ficha completa da cliente.
 *
 * A ficha de saúde é categoria especial do RGPD (art. 9.º) e só é carregada
 * para quem tem `client:health:read` — não basta ver a cliente para ver as
 * alergias dela.
 */
export async function getClient(actor: Actor, clientId: string) {
  const scope = clientScope(actor);

  const client = await prisma.client.findFirst({
    where: { ...scope, id: clientId },
    include: {
      travelZone: true,
      ownerProfessional: {
        select: { id: true, displayName: true, color: true },
      },
      tags: { include: { tag: true } },
      addresses: { orderBy: { isDefault: "desc" } },
      appointments: {
        where: { deletedAt: null },
        orderBy: { startAt: "desc" },
        take: 20,
        include: {
          professional: {
            select: { id: true, displayName: true, color: true },
          },
          items: { select: { nameSnapshot: true, totalCents: true } },
        },
      },
      loyaltyCards: {
        where: { isActive: true },
        include: { stamps: true },
      },
    },
  });

  if (!client) throw new NotFoundError("Cliente");

  return client;
}

/** Contadores para os cartões de topo da listagem. */
export async function clientCounts(actor: Actor) {
  const scope = clientScope(actor);

  const grouped = await prisma.client.groupBy({
    by: ["status"],
    where: scope,
    _count: { _all: true },
  });

  const counts: Record<ClientStatus, number> = {
    LEAD: 0,
    ACTIVE: 0,
    AT_RISK: 0,
    DORMANT: 0,
    BLOCKED: 0,
  };
  for (const row of grouped) counts[row.status] = row._count._all;

  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  return { ...counts, total };
}

// ── Escrita ──────────────────────────────────────────────────

export async function createClient(actor: Actor, input: ClientInput) {
  assertCan(actor, "client:create");

  const data = normalizeInput(input);

  // Deduplicação por telefone dentro da unidade. Não bloqueia por email porque
  // é comum uma cliente partilhar o email do companheiro ou não ter nenhum.
  const existing = await prisma.client.findFirst({
    where: { unitId: actor.unitId, phone: data.phone, deletedAt: null },
    select: { id: true, firstName: true, lastName: true },
  });
  if (existing) {
    throw new ConflictError(
      "CLIENT_DUPLICATE_PHONE",
      `Já existe uma ficha com este telefone: ${existing.firstName} ${existing.lastName ?? ""}`.trim() +
        ". Abra a ficha existente em vez de criar outra.",
      { clientId: existing.id },
    );
  }

  const travelZoneId = await resolveTravelZone(actor.unitId, data.postalCode);

  return prisma.$transaction(async (tx) => {
    const created = await tx.client.create({
      data: {
        ...data,
        unitId: actor.unitId,
        travelZoneId,
        status: input.status ?? "LEAD",
        source: input.source ?? null,
        // Uma profissional que cria uma ficha fica responsável por ela — de
        // outro modo perderia acesso à cliente que acabou de registar.
        ownerProfessionalId:
          input.ownerProfessionalId ?? actor.professionalId ?? null,
        marketingOptIn: input.marketingOptIn ?? false,
        marketingOptInAt: input.marketingOptIn ? new Date() : null,
      },
    });

    await recordAudit(tx, actor, {
      action: "CREATE",
      entityType: "Client",
      entityId: created.id,
      after: created,
    });

    await recordTimeline(tx, actor, {
      clientId: created.id,
      entityType: "Client",
      entityId: created.id,
      type: "CLIENT_CREATED",
      title: "Ficha criada",
    });

    return created;
  });
}

export async function updateClient(
  actor: Actor,
  clientId: string,
  input: Partial<ClientInput>,
) {
  assertCan(actor, "client:update");

  const before = await prisma.client.findFirst({
    where: { unitId: actor.unitId, id: clientId, deletedAt: null },
  });
  if (!before) throw new NotFoundError("Cliente");

  // Bloqueia o acesso por ID direto: a filtragem da lista não chega, porque
  // aqui o ID vem do URL e não de uma listagem já filtrada.
  assertOwns(actor, "client:update", before.ownerProfessionalId);

  const data = normalizeInput({ ...before, ...input } as ClientInput);

  if (data.phone !== before.phone) {
    const clash = await prisma.client.findFirst({
      where: {
        unitId: actor.unitId,
        phone: data.phone,
        deletedAt: null,
        NOT: { id: clientId },
      },
      select: { id: true, firstName: true },
    });
    if (clash) {
      throw new ConflictError(
        "CLIENT_DUPLICATE_PHONE",
        `O telefone já pertence à ficha de ${clash.firstName}.`,
        { clientId: clash.id },
      );
    }
  }

  const travelZoneId =
    data.postalCode !== before.postalCode
      ? await resolveTravelZone(actor.unitId, data.postalCode)
      : before.travelZoneId;

  const optInChanged =
    input.marketingOptIn !== undefined &&
    input.marketingOptIn !== before.marketingOptIn;

  return prisma.$transaction(async (tx) => {
    const updated = await tx.client.update({
      where: { id: clientId },
      data: {
        ...data,
        travelZoneId,
        status: input.status ?? before.status,
        source: input.source ?? before.source,
        ownerProfessionalId:
          input.ownerProfessionalId !== undefined
            ? input.ownerProfessionalId
            : before.ownerProfessionalId,
        ...(optInChanged && {
          marketingOptIn: input.marketingOptIn,
          // A data do consentimento é prova legal (RGPD art. 7.º n.º 1) —
          // regista-se quando é dado, e limpa-se quando é retirado.
          marketingOptInAt: input.marketingOptIn ? new Date() : null,
        }),
      },
    });

    const diff = diffFields(
      before as unknown as Record<string, unknown>,
      updated as unknown as Record<string, unknown>,
    );

    await recordAudit(tx, actor, {
      action: "UPDATE",
      entityType: "Client",
      entityId: clientId,
      before: diff.before,
      after: diff.after,
    });

    return updated;
  });
}

/**
 * Apaga a ficha (soft delete).
 *
 * Não é apagar de verdade: o histórico de atendimentos, faturas e comissões
 * depende desta linha. Para apagar mesmo, existe o pedido RGPD de eliminação,
 * que é um processo à parte e auditado.
 */
export async function deleteClient(actor: Actor, clientId: string) {
  assertCan(actor, "client:delete");

  const before = await prisma.client.findFirst({
    where: { unitId: actor.unitId, id: clientId, deletedAt: null },
  });
  if (!before) throw new NotFoundError("Cliente");

  const upcoming = await prisma.appointment.count({
    where: {
      clientId,
      deletedAt: null,
      startAt: { gte: new Date() },
      status: { notIn: ["CANCELLED", "NO_SHOW"] },
    },
  });
  if (upcoming > 0) {
    throw new ConflictError(
      "CLIENT_HAS_UPCOMING",
      `Esta cliente tem ${upcoming} marcação(ões) por realizar. Cancele-as primeiro.`,
    );
  }

  return prisma.$transaction(async (tx) => {
    const deleted = await tx.client.update({
      where: { id: clientId },
      data: { deletedAt: new Date() },
    });

    // A ficha fica só marcada como apagada (histórico e faturação dependem
    // dela), mas a conta de acesso ao portal é apagada a sério — senão o
    // e-mail continua "ocupado" e a cliente nunca consegue criar conta nova
    // com o mesmo e-mail, mesmo depois de a ficha ter sido apagada.
    await tx.clientAccount.deleteMany({ where: { clientId } });

    await recordAudit(tx, actor, {
      action: "DELETE",
      entityType: "Client",
      entityId: clientId,
      before,
    });

    return deleted;
  });
}

/**
 * Recalcula o estado das clientes com base na última visita.
 *
 * Corre num cron diário. É o que faz aparecer no painel "2 em risco" sem
 * ninguém ter de marcar nada à mão.
 */
export async function refreshClientStatuses(unitId: string): Promise<number> {
  const now = Date.now();
  const atRiskCutoff = new Date(now - AT_RISK_DAYS * 86_400_000);
  const dormantCutoff = new Date(now - DORMANT_DAYS * 86_400_000);

  const [toAtRisk, toDormant] = await Promise.all([
    prisma.client.updateMany({
      where: {
        unitId,
        deletedAt: null,
        status: "ACTIVE",
        lastVisitAt: { lt: atRiskCutoff, gte: dormantCutoff },
      },
      data: { status: "AT_RISK" },
    }),
    prisma.client.updateMany({
      where: {
        unitId,
        deletedAt: null,
        status: { in: ["ACTIVE", "AT_RISK"] },
        lastVisitAt: { lt: dormantCutoff },
      },
      data: { status: "DORMANT" },
    }),
  ]);

  return toAtRisk.count + toDormant.count;
}
