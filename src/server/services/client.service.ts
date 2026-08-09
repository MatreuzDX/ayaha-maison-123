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
import { hashPassword } from "@/server/auth";
import { MIN_PASSWORD_LENGTH } from "@/lib/demo";
import { diffFields, recordAudit } from "@/server/audit";
import { recordTimeline } from "@/server/timeline";
import { ConflictError, NotFoundError, ValidationError } from "@/server/errors";
import {
  type Actor,
  assertCan,
  assertOwns,
  can,
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
      account: {
        select: {
          id: true,
          email: true,
          approvedAt: true,
          passwordHash: true,
          googleId: true,
        },
      },
    },
  });

  if (!client) throw new NotFoundError("Cliente");

  // O hash da palavra-passe não sai daqui. Quem chama só precisa de saber
  // SE existe palavra-passe, nunca qual é — e assim não há forma de, por
  // descuido, acabar a mandá-lo para o browser dentro de um componente.
  const { account, ...restOfClient } = client;
  return {
    ...restOfClient,
    account: account
      ? {
          id: account.id,
          email: account.email,
          approvedAt: account.approvedAt,
          hasPassword: account.passwordHash !== null,
          hasGoogle: account.googleId !== null,
        }
      : null,
  };
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
 * Aprova uma conta de acesso ao portal criada pela própria cliente.
 *
 * Contas ligadas a uma ficha já conhecida (telefone já na base) aprovam-se
 * sozinhas em `registerClient`/`completeGoogleSignup`; isto é só para as que
 * ficaram pendentes por terem criado uma ficha nova, nunca vista antes.
 */
export async function approveClientAccount(actor: Actor, clientId: string) {
  assertCan(actor, "client:update");

  const client = await prisma.client.findFirst({
    where: { unitId: actor.unitId, id: clientId, deletedAt: null },
    include: { account: true },
  });
  if (!client) throw new NotFoundError("Cliente");
  assertOwns(actor, "client:update", client.ownerProfessionalId);

  if (!client.account) {
    throw new NotFoundError("Conta de acesso ao portal");
  }
  if (client.account.approvedAt) {
    return client.account;
  }

  return prisma.$transaction(async (tx) => {
    const approved = await tx.clientAccount.update({
      where: { id: client.account!.id },
      data: { approvedAt: new Date() },
    });

    await recordAudit(tx, actor, {
      action: "UPDATE",
      entityType: "ClientAccount",
      entityId: client.account!.id,
      before: client.account,
      after: approved,
    });

    return approved;
  });
}

// ── Gestão do acesso ao portal ───────────────────────────────
//
// A equipa gere o acesso da cliente, mas NUNCA vê a palavra-passe. Não é
// uma opção de interface — é uma impossibilidade: só fica guardado um hash
// Argon2id, que não se desfaz. Nem a equipa, nem quem tiver acesso à base
// de dados, consegue ler a palavra-passe de ninguém.
//
// O que a equipa pode fazer: corrigir o e-mail, definir uma palavra-passe
// nova (quando a cliente pede por telefone ou WhatsApp), e cortar o acesso.

/** Carrega a ficha + conta, já com as permissões e o escopo verificados. */
async function loadAccountForManagement(actor: Actor, clientId: string) {
  assertCan(actor, "client:update");

  const client = await prisma.client.findFirst({
    where: { unitId: actor.unitId, id: clientId, deletedAt: null },
    include: { account: true },
  });
  if (!client) throw new NotFoundError("Cliente");
  assertOwns(actor, "client:update", client.ownerProfessionalId);

  if (!client.account) throw new NotFoundError("Conta de acesso ao portal");
  return { client, account: client.account };
}

/**
 * Contas criadas pela própria cliente e ainda por aprovar.
 *
 * Alimenta a lista no início do CRM. Sem ela, a equipa só descobria um
 * pedido novo se por acaso abrisse a ficha da pessoa — e quem se registou
 * ficava à espera sem ninguém saber.
 */
export async function listPendingAccounts(actor: Actor) {
  if (!can(actor, "client:read")) return [];

  const clients = await prisma.client.findMany({
    where: {
      ...clientScope(actor),
      account: { is: { approvedAt: null } },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      phone: true,
      createdAt: true,
      account: { select: { email: true, createdAt: true } },
    },
  });

  return clients.map((c) => ({
    clientId: c.id,
    firstName: c.firstName,
    lastName: c.lastName,
    phone: c.phone,
    email: c.account?.email ?? "",
    requestedAt: c.account?.createdAt ?? c.createdAt,
  }));
}

// ── Retoques a fazer ─────────────────────────────────────────
//
// As extensões pedem manutenção a cada 2-3 semanas. Passado esse tempo,
// ou a cliente volta ou os cílios caem e ela deixa de ser cliente. É o
// hábito mais valioso do negócio e o mais fácil de esquecer.
//
// Isto é uma LISTA DE TRABALHO, não um envio automático: a equipa vê quem
// está na altura e manda a mensagem com um clique. Um envio em massa
// automático exigia a API da Meta e consentimento registado — uma
// mensagem individual da profissional para a sua cliente é outra coisa.

/** A partir de quando faz sentido lembrar (dias desde a última visita). */
const RETOUCH_FROM_DAYS = 18;

export interface RetouchDue {
  clientId: string;
  firstName: string;
  lastName: string | null;
  phone: string;
  lastVisitAt: Date;
  daysSince: number;
  lastService: string | null;
}

export async function listRetouchDue(actor: Actor): Promise<RetouchDue[]> {
  if (!can(actor, "client:read")) return [];

  const now = Date.now();
  const desde = new Date(now - RETOUCH_FROM_DAYS * 86_400_000);
  // A partir dos 45 dias a cliente já entra em "em risco", que é outro
  // problema e tem outro tratamento — não sobrepor os dois.
  const ate = new Date(now - AT_RISK_DAYS * 86_400_000);

  const clients = await prisma.client.findMany({
    where: {
      ...clientScope(actor),
      status: { notIn: ["BLOCKED"] },
      lastVisitAt: { lte: desde, gte: ate },
      // Já tem a próxima marcada — não há nada a lembrar.
      appointments: {
        none: {
          deletedAt: null,
          startAt: { gte: new Date() },
          status: { notIn: ["CANCELLED", "NO_SHOW"] },
        },
      },
    },
    orderBy: { lastVisitAt: "asc" },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      phone: true,
      lastVisitAt: true,
      appointments: {
        where: { deletedAt: null, status: "COMPLETED" },
        orderBy: { startAt: "desc" },
        take: 1,
        select: { items: { select: { nameSnapshot: true }, take: 1 } },
      },
    },
  });

  return clients
    .filter((c) => c.lastVisitAt !== null)
    .map((c) => ({
      clientId: c.id,
      firstName: c.firstName,
      lastName: c.lastName,
      phone: c.phone,
      lastVisitAt: c.lastVisitAt!,
      daysSince: Math.floor((now - c.lastVisitAt!.getTime()) / 86_400_000),
      lastService: c.appointments[0]?.items[0]?.nameSnapshot ?? null,
    }));
}

/**
 * Recusa um pedido de acesso ao portal.
 *
 * Apaga a conta de acesso — a pessoa deixa de conseguir entrar e o e-mail
 * fica livre outra vez. A ficha de cliente FICA: pode ser alguém que a
 * equipa quer mesmo como contacto, só não com acesso online agora. Para
 * apagar tudo existe o botão "Apagar" na ficha.
 */
export async function refuseClientAccount(actor: Actor, clientId: string) {
  const { client, account } = await loadAccountForManagement(actor, clientId);

  if (account.approvedAt) {
    throw new ValidationError(
      "Esta conta já está aprovada. Use 'Remover acesso' se quiser cortá-la.",
    );
  }

  return prisma.$transaction(async (tx) => {
    await tx.clientSession.deleteMany({
      where: { clientAccountId: account.id },
    });
    await tx.clientAccount.delete({ where: { id: account.id } });

    await recordAudit(tx, actor, {
      action: "DELETE",
      entityType: "ClientAccount",
      entityId: account.id,
      before: { email: account.email, clientId: client.id },
    });

    return { email: account.email };
  });
}

export async function updateClientAccountEmail(
  actor: Actor,
  clientId: string,
  newEmail: string,
) {
  const { account } = await loadAccountForManagement(actor, clientId);

  const email = newEmail.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    throw new ValidationError("E-mail inválido.");
  }
  if (email === account.email) return account;

  const clash = await prisma.clientAccount.findUnique({ where: { email } });
  if (clash) {
    throw new ConflictError(
      "ACCOUNT_DUPLICATE_EMAIL",
      "Já existe outra conta com este e-mail.",
    );
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.clientAccount.update({
      where: { id: account.id },
      data: { email },
    });

    await recordAudit(tx, actor, {
      action: "UPDATE",
      entityType: "ClientAccount",
      entityId: account.id,
      before: { email: account.email },
      after: { email: updated.email },
    });

    return updated;
  });
}

/**
 * Define uma palavra-passe nova para a cliente.
 *
 * Serve o caso real: a cliente liga a dizer que não consegue entrar e
 * combina uma palavra-passe nova. Todas as sessões abertas são fechadas —
 * se alguém tinha entrado indevidamente, deixa de estar lá dentro.
 */
export async function setClientAccountPassword(
  actor: Actor,
  clientId: string,
  newPassword: string,
) {
  const { account } = await loadAccountForManagement(actor, clientId);

  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    throw new ValidationError(
      `A palavra-passe tem de ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`,
    );
  }

  const passwordHash = await hashPassword(newPassword);

  return prisma.$transaction(async (tx) => {
    const updated = await tx.clientAccount.update({
      where: { id: account.id },
      data: { passwordHash },
    });
    await tx.clientSession.deleteMany({
      where: { clientAccountId: account.id },
    });

    // O hash nunca entra no registo de auditoria — fica só o facto de ter
    // sido mudada, por quem e quando.
    await recordAudit(tx, actor, {
      action: "UPDATE",
      entityType: "ClientAccount",
      entityId: account.id,
      after: { passwordChanged: true },
    });

    return updated;
  });
}

/**
 * Corta o acesso da cliente ao portal, sem apagar a ficha nem o histórico.
 *
 * Tira a palavra-passe, desliga o Google (senão continuava a entrar por
 * lá) e fecha as sessões abertas. A conta e o e-mail ficam — é reversível
 * definindo uma palavra-passe nova.
 */
export async function revokeClientAccountAccess(
  actor: Actor,
  clientId: string,
) {
  const { account } = await loadAccountForManagement(actor, clientId);

  return prisma.$transaction(async (tx) => {
    const updated = await tx.clientAccount.update({
      where: { id: account.id },
      data: { passwordHash: null, googleId: null },
    });
    await tx.clientSession.deleteMany({
      where: { clientAccountId: account.id },
    });

    await recordAudit(tx, actor, {
      action: "UPDATE",
      entityType: "ClientAccount",
      entityId: account.id,
      before: {
        hadPassword: account.passwordHash !== null,
        hadGoogle: account.googleId !== null,
      },
      after: { accessRevoked: true },
    });

    return updated;
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
