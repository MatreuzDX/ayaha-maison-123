/**
 * Linha do tempo da cliente. Ver especificação secção 24.
 *
 * Não confundir com `AuditLog` (ver `src/server/audit.ts`):
 *   - `AuditLog`      → conformidade. Técnico, imutável, só o OWNER lê.
 *   - `TimelineEvent` → produto. É o que a equipa lê na ficha da cliente:
 *                       "Voltou ao fim de 3 semanas", "Carimbo 5 de 5".
 *
 * Por isso os títulos aqui são escritos para uma pessoa, não para um log.
 */

import type { PrismaTx } from "./db";

export type TimelineType =
  | "CLIENT_CREATED"
  | "APPOINTMENT_BOOKED"
  | "APPOINTMENT_COMPLETED"
  | "APPOINTMENT_CANCELLED"
  | "APPOINTMENT_NO_SHOW"
  | "LOYALTY_STAMP"
  | "LOYALTY_CARD_COMPLETED"
  | "REWARD_REDEEMED"
  | "NOTE_ADDED"
  | "MESSAGE_SENT"
  | "CONSENT_CHANGED";

export interface TimelineInput {
  clientId?: string | null;
  entityType: string;
  entityId: string;
  type: TimelineType;
  title: string;
  body?: string | null;
  icon?: string | null;
  isPinned?: boolean;
  metadata?: Record<string, unknown>;
  occurredAt?: Date;
}

/**
 * Grava um evento na linha do tempo.
 *
 * `actorName` fica desnormalizado de propósito: quando uma profissional sai da
 * equipa, o histórico continua a dizer quem fez o quê. Guardar só o ID daria
 * uma timeline cheia de "utilizador desconhecido" passado um ano.
 */
export async function recordTimeline(
  tx: PrismaTx,
  actor: { userId: string | null; unitId: string } | null,
  entry: TimelineInput,
  actorName?: string | null,
): Promise<void> {
  await tx.timelineEvent.create({
    data: {
      unitId: actor?.unitId ?? "",
      clientId: entry.clientId ?? null,
      entityType: entry.entityType,
      entityId: entry.entityId,
      type: entry.type,
      title: entry.title,
      body: entry.body ?? null,
      icon: entry.icon ?? null,
      actorId: actor?.userId ?? null,
      actorName: actorName ?? null,
      isPinned: entry.isPinned ?? false,
      metadata: (entry.metadata ?? {}) as never,
      occurredAt: entry.occurredAt ?? new Date(),
    },
  });
}
