/**
 * Dados da área de cliente (`/conta`) — sempre alcançados pelo próprio
 * `clientId` da sessão, nunca por um `Actor` de equipa. Não precisa de
 * verificação de permissões: a sessão já garante que só se vê o que é seu.
 */

import type { AppointmentStatus } from "@prisma/client";
import { prisma } from "./db";
import { ConflictError, NotFoundError, ValidationError } from "./errors";
import { hashPassword, verifyPassword } from "./auth";
import { MIN_PASSWORD_LENGTH } from "@/lib/demo";
import {
  normalizePhone,
  isValidPostalCode,
  normalizePostalCode,
} from "@/lib/format";

export interface PortalAppointment {
  id: string;
  code: string;
  startAt: Date;
  endAt: Date;
  status: AppointmentStatus;
  services: string[];
  professionalName: string;
  totalCents: number;
  travelFeeCents: number;
  clientNotes: string | null;
}

/** Estados em que a marcação ainda vai acontecer. */
export const OPEN_STATUSES: AppointmentStatus[] = [
  "REQUESTED",
  "CONFIRMED",
  "REMINDED",
  "EN_ROUTE",
  "IN_PROGRESS",
];

export interface PortalLoyaltyCard {
  cycleNumber: number;
  stampsCount: number;
  stampsRequired: number;
}

export interface ClientPortalData {
  appointments: PortalAppointment[];
  loyaltyCard: PortalLoyaltyCard | null;
}

/**
 * Converte uma marcação da base para o formato do portal.
 *
 * Repare-se no que NÃO vai: `internalNotes`, custos, comissões. São notas
 * e números da equipa — a cliente não os deve ver, e a forma mais segura
 * de garantir isso é nunca os pôr no objeto que sai daqui.
 */
function toPortalAppointment(a: {
  id: string;
  code: string;
  startAt: Date;
  endAt: Date;
  status: AppointmentStatus;
  totalCents: number;
  travelFeeCents: number;
  clientNotes: string | null;
  professional: { displayName: string };
  items: { nameSnapshot: string }[];
}): PortalAppointment {
  return {
    id: a.id,
    code: a.code,
    startAt: a.startAt,
    endAt: a.endAt,
    status: a.status,
    services: a.items.map((i) => i.nameSnapshot),
    professionalName: a.professional.displayName,
    totalCents: a.totalCents,
    travelFeeCents: a.travelFeeCents,
    clientNotes: a.clientNotes,
  };
}

const APPOINTMENT_SELECT = {
  id: true,
  code: true,
  startAt: true,
  endAt: true,
  status: true,
  totalCents: true,
  travelFeeCents: true,
  clientNotes: true,
  professional: { select: { displayName: true } },
  items: { select: { nameSnapshot: true } },
} as const;

export async function getClientPortalData(
  clientId: string,
): Promise<ClientPortalData> {
  const [appointments, loyaltyCard] = await Promise.all([
    prisma.appointment.findMany({
      where: { clientId, deletedAt: null },
      orderBy: { startAt: "desc" },
      take: 15,
      select: APPOINTMENT_SELECT,
    }),
    prisma.loyaltyCard.findFirst({
      where: { clientId, isActive: true },
    }),
  ]);

  return {
    appointments: appointments.map(toPortalAppointment),
    loyaltyCard: loyaltyCard
      ? {
          cycleNumber: loyaltyCard.cycleNumber,
          stampsCount: loyaltyCard.stampsCount,
          stampsRequired: loyaltyCard.stampsRequired,
        }
      : null,
  };
}

// ── Painel de entrada ────────────────────────────────────────

export interface PortalDashboard {
  nextAppointment: PortalAppointment | null;
  totalAppointments: number;
  completedCount: number;
  availableBenefits: number;
  loyaltyCard: PortalLoyaltyCard | null;
}

export async function getPortalDashboard(
  clientId: string,
): Promise<PortalDashboard> {
  const now = new Date();

  const [next, total, completed, benefits, loyaltyCard] = await Promise.all([
    prisma.appointment.findFirst({
      where: {
        clientId,
        deletedAt: null,
        startAt: { gte: now },
        status: { in: OPEN_STATUSES },
      },
      orderBy: { startAt: "asc" },
      select: APPOINTMENT_SELECT,
    }),
    prisma.appointment.count({ where: { clientId, deletedAt: null } }),
    prisma.appointment.count({
      where: { clientId, deletedAt: null, status: "COMPLETED" },
    }),
    prisma.rewardRedemption.count({
      where: { clientId, status: "AVAILABLE" },
    }),
    prisma.loyaltyCard.findFirst({ where: { clientId, isActive: true } }),
  ]);

  return {
    nextAppointment: next ? toPortalAppointment(next) : null,
    totalAppointments: total,
    completedCount: completed,
    availableBenefits: benefits,
    loyaltyCard: loyaltyCard
      ? {
          cycleNumber: loyaltyCard.cycleNumber,
          stampsCount: loyaltyCard.stampsCount,
          stampsRequired: loyaltyCard.stampsRequired,
        }
      : null,
  };
}

// ── Marcações ────────────────────────────────────────────────

export interface PortalAppointments {
  upcoming: PortalAppointment[];
  past: PortalAppointment[];
}

export async function getPortalAppointments(
  clientId: string,
): Promise<PortalAppointments> {
  const all = await prisma.appointment.findMany({
    where: { clientId, deletedAt: null },
    orderBy: { startAt: "desc" },
    select: APPOINTMENT_SELECT,
  });

  const now = new Date();
  const items = all.map(toPortalAppointment);

  return {
    upcoming: items
      .filter((a) => OPEN_STATUSES.includes(a.status) && a.startAt >= now)
      .sort((a, b) => a.startAt.getTime() - b.startAt.getTime()),
    past: items.filter(
      (a) => !(OPEN_STATUSES.includes(a.status) && a.startAt >= now),
    ),
  };
}

// ── Benefícios ───────────────────────────────────────────────
//
// Vêm de duas origens que já existem: recompensas do AYAHA Club que a
// cliente escolheu (`RewardRedemption`, com código próprio) e cupões da
// unidade que estejam válidos. Nada é inventado — se não houver nenhum,
// a página diz que não há.

export interface PortalBenefit {
  id: string;
  title: string;
  description: string;
  code: string | null;
  expiresAt: Date | null;
  origin: "recompensa" | "cupao";
}

export async function getPortalBenefits(
  clientId: string,
  unitId: string,
): Promise<PortalBenefit[]> {
  const now = new Date();

  const [redemptions, coupons, usedCoupons] = await Promise.all([
    prisma.rewardRedemption.findMany({
      where: { clientId, status: "AVAILABLE" },
      orderBy: { chosenAt: "desc" },
      include: { reward: { select: { name: true, description: true } } },
    }),
    prisma.coupon.findMany({
      where: {
        unitId,
        isActive: true,
        validFrom: { lte: now },
        OR: [{ validUntil: null }, { validUntil: { gte: now } }],
      },
      orderBy: { validUntil: "asc" },
    }),
    prisma.couponRedemption.groupBy({
      by: ["couponId"],
      where: { clientId },
      _count: { couponId: true },
    }),
  ]);

  const usosPorCupao = new Map(
    usedCoupons.map((u) => [u.couponId, u._count.couponId]),
  );

  const beneficios: PortalBenefit[] = redemptions.map((r) => ({
    id: r.id,
    title: r.reward.name,
    description: r.reward.description ?? "",
    code: r.code,
    expiresAt: r.expiresAt,
    origin: "recompensa" as const,
  }));

  for (const c of coupons) {
    // Já gasto por esta cliente tantas vezes quantas podia — não mostrar.
    const usos = usosPorCupao.get(c.id) ?? 0;
    if (usos >= c.perClientLimit) continue;
    if (c.usageLimit !== null && c.usedCount >= c.usageLimit) continue;

    beneficios.push({
      id: c.id,
      title: c.name,
      description:
        c.minSubtotalCents > 0
          ? `Válido em atendimentos a partir de ${(c.minSubtotalCents / 100).toFixed(2)} €.`
          : "",
      code: c.code,
      expiresAt: c.validUntil,
      origin: "cupao",
    });
  }

  return beneficios;
}

export interface ProfileInput {
  firstName: string;
  lastName?: string | null;
  phone: string;
  addressLine?: string | null;
  addressExtra?: string | null;
  postalCode?: string | null;
  city?: string | null;
  accessNotes?: string | null;
  parkingNotes?: string | null;
}

/**
 * A cliente edita a própria ficha — só os campos práticos (contacto,
 * morada, como entrar em casa). Nunca `status`, `notes` internas,
 * `ownerProfessionalId` ou outros campos que são só da equipa gerir.
 */
export async function updateOwnProfile(
  clientId: string,
  unitId: string,
  input: ProfileInput,
) {
  const firstName = input.firstName?.trim();
  if (!firstName) {
    throw new ValidationError("Indique o seu primeiro nome.");
  }

  const phone = normalizePhone(input.phone ?? "");
  if (!phone) {
    throw new ValidationError(
      "Telefone inválido. Escreva um número português (933 055 502) ou internacional (+34 600 000 000).",
    );
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

  const clash = await prisma.client.findFirst({
    where: { unitId, phone, deletedAt: null, NOT: { id: clientId } },
    select: { id: true },
  });
  if (clash) {
    throw new ConflictError(
      "CLIENT_DUPLICATE_PHONE",
      "Já existe outra ficha com este telefone. Contacte a equipa se algo estiver errado.",
    );
  }

  return prisma.client.update({
    where: { id: clientId },
    data: {
      firstName,
      lastName: input.lastName?.trim() || null,
      phone,
      addressLine: input.addressLine?.trim() || null,
      addressExtra: input.addressExtra?.trim() || null,
      postalCode,
      city: input.city?.trim() || "Lisboa",
      accessNotes: input.accessNotes?.trim() || null,
      parkingNotes: input.parkingNotes?.trim() || null,
    },
  });
}

// ── Segurança da conta ───────────────────────────────────────

/**
 * A cliente muda a própria palavra-passe.
 *
 * Exige a atual, mesmo já estando autenticada: se alguém apanhar o
 * telemóvel destrancado, não deve conseguir mudar a palavra-passe e
 * trancar a dona cá fora.
 *
 * Contas criadas só por Google não têm palavra-passe; nesse caso esta
 * função recusa e a página explica que se entra pelo Google.
 */
export async function changeOwnPassword(
  accountId: string,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const account = await prisma.clientAccount.findUnique({
    where: { id: accountId },
  });
  if (!account) throw new NotFoundError("Conta");

  if (!account.passwordHash) {
    throw new ValidationError(
      "A sua conta entra pelo Google, por isso não tem palavra-passe aqui. Para passar a ter uma, fale connosco.",
    );
  }

  const confere = await verifyPassword(account.passwordHash, currentPassword);
  if (!confere) {
    throw new ValidationError("A palavra-passe atual não está correta.");
  }

  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    throw new ValidationError(
      `A palavra-passe nova tem de ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`,
    );
  }
  if (newPassword === currentPassword) {
    throw new ValidationError(
      "A palavra-passe nova tem de ser diferente da atual.",
    );
  }

  const passwordHash = await hashPassword(newPassword);

  await prisma.$transaction(async (tx) => {
    await tx.clientAccount.update({
      where: { id: accountId },
      data: { passwordHash },
    });
    // Fecha as outras sessões: se a palavra-passe foi mudada por a pessoa
    // desconfiar que alguém entrou, tem de expulsar essa pessoa.
    await tx.clientSession.deleteMany({
      where: { clientAccountId: accountId },
    });
  });
}

/** O que a página de segurança precisa de saber sobre a conta. */
export async function getAccountSecurity(accountId: string) {
  const account = await prisma.clientAccount.findUnique({
    where: { id: accountId },
    select: {
      email: true,
      passwordHash: true,
      googleId: true,
      lastLoginAt: true,
      createdAt: true,
    },
  });
  if (!account) throw new NotFoundError("Conta");

  // Nunca devolver o hash — só se existe.
  return {
    email: account.email,
    hasPassword: account.passwordHash !== null,
    hasGoogle: account.googleId !== null,
    lastLoginAt: account.lastLoginAt,
    createdAt: account.createdAt,
  };
}
