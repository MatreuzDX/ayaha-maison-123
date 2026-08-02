/**
 * Dados da área de cliente (`/conta`) — sempre alcançados pelo próprio
 * `clientId` da sessão, nunca por um `Actor` de equipa. Não precisa de
 * verificação de permissões: a sessão já garante que só se vê o que é seu.
 */

import type { AppointmentStatus } from "@prisma/client";
import { prisma } from "./db";

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
