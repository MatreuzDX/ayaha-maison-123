/**
 * Registo de auditoria. Ver especificação secção 24.
 *
 * Duas tabelas com propósitos diferentes, e não se devem confundir:
 *   - `AuditLog`      → conformidade. Técnico, imutável, só o OWNER lê.
 *   - `TimelineEvent` → produto. É o que a equipa vê na ficha da cliente.
 *
 * Regra inviolável: toda a escrita de negócio grava `AuditLog` DENTRO da mesma
 * transação. Se a operação falhar, o log desaparece com ela; se o log falhar,
 * a operação é revertida. Nunca ficam a divergir.
 */

import type { Prisma } from "@prisma/client";
import type { PrismaTx } from "./db";
import type { Actor } from "./permissions";

export type AuditAction =
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "LOGIN"
  | "LOGIN_FAILED"
  | "LOGOUT"
  | "PASSWORD_CHANGED"
  | "MFA_ENABLED"
  | "VIEW_SENSITIVE"
  | "EXPORT"
  | "OVERRIDE"
  | "PERMISSION_CHANGED";

/**
 * Campos que nunca podem aparecer no log, mesmo em `before`/`after`.
 * Se um destes chegasse ao AuditLog, uma exportação de auditoria passaria a
 * ser uma fuga de credenciais.
 */
const REDACTED_FIELDS = new Set([
  "passwordHash",
  "password",
  "mfaSecret",
  "sessionToken",
  "ibanEncrypted",
  "iban",
  "token",
  "secret",
]);

function redact(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value !== "object") return value as Prisma.InputJsonValue;
  if (Array.isArray(value)) {
    return value.map((v) => redact(v)) as Prisma.InputJsonValue;
  }

  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    if (REDACTED_FIELDS.has(key)) {
      out[key] = "[REDACTED]";
    } else if (val instanceof Date) {
      out[key] = val.toISOString();
    } else if (val && typeof val === "object") {
      out[key] = redact(val);
    } else {
      out[key] = val;
    }
  }
  return out as Prisma.InputJsonValue;
}

export interface AuditContext {
  ip?: string | null;
  userAgent?: string | null;
}

export interface AuditEntry {
  action: AuditAction;
  entityType: string;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
}

/** Grava uma entrada de auditoria. Chamar sempre com o `tx` da operação. */
export async function recordAudit(
  tx: PrismaTx,
  actor: Pick<Actor, "userId" | "unitId"> | null,
  entry: AuditEntry,
  ctx: AuditContext = {},
): Promise<void> {
  await tx.auditLog.create({
    data: {
      unitId: actor?.unitId ?? null,
      userId: actor?.userId ?? null,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId ?? null,
      before: redact(entry.before),
      after: redact(entry.after),
      ip: ctx.ip ?? null,
      userAgent: ctx.userAgent ?? null,
    },
  });
}

/**
 * Regista o acesso a dados sensíveis (ficha de saúde, IBAN, documentos).
 * O RGPD exige poder demonstrar quem viu dados de categoria especial e quando.
 */
export async function recordSensitiveAccess(
  tx: PrismaTx,
  actor: Pick<Actor, "userId" | "unitId">,
  entityType: string,
  entityId: string,
  ctx: AuditContext = {},
): Promise<void> {
  await recordAudit(
    tx,
    actor,
    { action: "VIEW_SENSITIVE", entityType, entityId },
    ctx,
  );
}

/** Regista uma exportação de dados, com a contagem de registos levados. */
export async function recordExport(
  tx: PrismaTx,
  actor: Pick<Actor, "userId" | "unitId">,
  entityType: string,
  recordCount: number,
  ctx: AuditContext = {},
): Promise<void> {
  await recordAudit(
    tx,
    actor,
    { action: "EXPORT", entityType, after: { recordCount } },
    ctx,
  );
}

/**
 * Diff mínimo entre dois estados — só os campos que mudaram.
 * Guardar o objeto inteiro em cada UPDATE tornaria a tabela ilegível e enorme.
 */
export function diffFields<T extends Record<string, unknown>>(
  before: T,
  after: Partial<T>,
): { before: Partial<T>; after: Partial<T> } {
  const b: Partial<T> = {};
  const a: Partial<T> = {};

  for (const key of Object.keys(after) as (keyof T)[]) {
    const oldValue = before[key];
    const newValue = after[key];
    const same =
      oldValue instanceof Date && newValue instanceof Date
        ? oldValue.getTime() === newValue.getTime()
        : oldValue === newValue;
    if (!same) {
      b[key] = oldValue;
      a[key] = newValue;
    }
  }

  return { before: b, after: a };
}
