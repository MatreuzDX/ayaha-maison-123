/**
 * Dados da área de cliente (`/conta`) — sempre alcançados pelo próprio
 * `clientId` da sessão, nunca por um `Actor` de equipa. Não precisa de
 * verificação de permissões: a sessão já garante que só se vê o que é seu.
 */

import type { AppointmentStatus } from "@prisma/client";
import { prisma } from "./db";
import { ConflictError, ValidationError } from "./errors";
import {
  normalizePhone,
  isValidPostalCode,
  normalizePostalCode,
} from "@/lib/format";

export interface PortalAppointment {
  id: string;
  startAt: Date;
  status: AppointmentStatus;
  services: string[];
  professionalName: string;
  totalCents: number;
}

export interface PortalLoyaltyCard {
  cycleNumber: number;
  stampsCount: number;
  stampsRequired: number;
}

export interface ClientPortalData {
  appointments: PortalAppointment[];
  loyaltyCard: PortalLoyaltyCard | null;
}

export async function getClientPortalData(
  clientId: string,
): Promise<ClientPortalData> {
  const [appointments, loyaltyCard] = await Promise.all([
    prisma.appointment.findMany({
      where: { clientId, deletedAt: null },
      orderBy: { startAt: "desc" },
      take: 15,
      include: {
        professional: { select: { displayName: true } },
        items: { select: { nameSnapshot: true } },
      },
    }),
    prisma.loyaltyCard.findFirst({
      where: { clientId, isActive: true },
    }),
  ]);

  return {
    appointments: appointments.map((a) => ({
      id: a.id,
      startAt: a.startAt,
      status: a.status,
      services: a.items.map((i) => i.nameSnapshot),
      professionalName: a.professional.displayName,
      totalCents: a.totalCents,
    })),
    loyaltyCard: loyaltyCard
      ? {
          cycleNumber: loyaltyCard.cycleNumber,
          stampsCount: loyaltyCard.stampsCount,
          stampsRequired: loyaltyCard.stampsRequired,
        }
      : null,
  };
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
