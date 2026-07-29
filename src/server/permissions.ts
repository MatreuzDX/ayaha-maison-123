/**
 * Controlo de acessos (RBAC). Ver especificação secção 7.
 *
 * Modelo: cada papel tem um conjunto base de permissões. `UserUnit.grants` e
 * `UserUnit.revokes` afinam caso a caso sem obrigar a criar papéis novos.
 *
 * Escopo: algumas permissões são "OWN" — a PROFESSIONAL vê apenas as suas
 * clientes e os seus atendimentos. Quem consulta a base tem de usar sempre os
 * helpers de escopo no fim deste ficheiro, nunca `findMany` a seco.
 */

import type { Prisma } from "@prisma/client";
import { Role } from "@prisma/client";
import { ForbiddenError } from "./errors";

export type Permission =
  // Clientes
  | "client:read"
  | "client:create"
  | "client:update"
  | "client:delete"
  | "client:health:read"
  | "client:health:write"
  | "client:export"
  // Marcações
  | "appointment:read"
  | "appointment:create"
  | "appointment:update"
  | "appointment:cancel"
  | "appointment:override_conflict"
  // Serviços
  | "service:read"
  | "service:write"
  // Equipa
  | "professional:read"
  | "professional:write"
  | "professional:pay_data"
  | "schedule:write"
  | "timeoff:approve"
  // Stock
  | "inventory:read"
  | "inventory:write"
  | "inventory:cost"
  // Financeiro
  | "finance:read"
  | "finance:write"
  | "finance:cash_close"
  | "commission:read"
  | "commission:approve"
  // Marketing e comunicação
  | "marketing:read"
  | "marketing:write"
  | "message:send"
  | "message:bulk"
  // Relatórios
  | "report:read"
  | "report:financial"
  // Administração
  | "audit:read"
  | "gdpr:handle"
  | "settings:write"
  | "user:manage";

/** `ALL` = todos os registos da unidade. `OWN` = só os próprios. `NONE` = nenhum. */
export type Scope = "ALL" | "OWN" | "NONE";

type RoleMatrix = Partial<Record<Permission, Scope>>;

const OWNER_PERMS: RoleMatrix = {
  "client:read": "ALL",
  "client:create": "ALL",
  "client:update": "ALL",
  "client:delete": "ALL",
  "client:health:read": "ALL",
  "client:health:write": "ALL",
  "client:export": "ALL",
  "appointment:read": "ALL",
  "appointment:create": "ALL",
  "appointment:update": "ALL",
  "appointment:cancel": "ALL",
  "appointment:override_conflict": "ALL",
  "service:read": "ALL",
  "service:write": "ALL",
  "professional:read": "ALL",
  "professional:write": "ALL",
  "professional:pay_data": "ALL",
  "schedule:write": "ALL",
  "timeoff:approve": "ALL",
  "inventory:read": "ALL",
  "inventory:write": "ALL",
  "inventory:cost": "ALL",
  "finance:read": "ALL",
  "finance:write": "ALL",
  "finance:cash_close": "ALL",
  "commission:read": "ALL",
  "commission:approve": "ALL",
  "marketing:read": "ALL",
  "marketing:write": "ALL",
  "message:send": "ALL",
  "message:bulk": "ALL",
  "report:read": "ALL",
  "report:financial": "ALL",
  "audit:read": "ALL",
  "gdpr:handle": "ALL",
  "settings:write": "ALL",
  "user:manage": "ALL",
};

const MANAGER_PERMS: RoleMatrix = {
  "client:read": "ALL",
  "client:create": "ALL",
  "client:update": "ALL",
  "client:health:read": "ALL",
  "client:health:write": "ALL",
  "appointment:read": "ALL",
  "appointment:create": "ALL",
  "appointment:update": "ALL",
  "appointment:cancel": "ALL",
  "appointment:override_conflict": "ALL",
  "service:read": "ALL",
  "service:write": "ALL",
  "professional:read": "ALL",
  "professional:write": "ALL",
  "schedule:write": "ALL",
  "timeoff:approve": "ALL",
  "inventory:read": "ALL",
  "inventory:write": "ALL",
  "inventory:cost": "ALL",
  "finance:read": "ALL",
  "finance:write": "ALL",
  "finance:cash_close": "ALL",
  "commission:read": "ALL",
  "marketing:read": "ALL",
  "marketing:write": "ALL",
  "message:send": "ALL",
  "message:bulk": "ALL",
  "report:read": "ALL",
  "report:financial": "ALL",
  "settings:write": "ALL",
  "user:manage": "ALL",
};

const PROFESSIONAL_PERMS: RoleMatrix = {
  "client:read": "OWN",
  "client:create": "ALL",
  "client:update": "OWN",
  "client:health:read": "OWN",
  "client:health:write": "ALL",
  "appointment:read": "OWN",
  "appointment:create": "ALL",
  "appointment:update": "OWN",
  "appointment:cancel": "OWN",
  "service:read": "ALL",
  "professional:read": "OWN",
  "professional:pay_data": "OWN",
  "schedule:write": "OWN",
  "inventory:read": "ALL",
  "inventory:write": "OWN",
  "finance:cash_close": "OWN",
  "commission:read": "OWN",
  "message:send": "ALL",
  "report:read": "OWN",
};

const RECEPTIONIST_PERMS: RoleMatrix = {
  "client:read": "ALL",
  "client:create": "ALL",
  "client:update": "ALL",
  "appointment:read": "ALL",
  "appointment:create": "ALL",
  "appointment:update": "ALL",
  "appointment:cancel": "ALL",
  "service:read": "ALL",
  "professional:read": "ALL",
  "inventory:read": "ALL",
  "inventory:write": "ALL",
  "finance:write": "OWN",
  "finance:cash_close": "ALL",
  "marketing:read": "ALL",
  "marketing:write": "ALL",
  "message:send": "ALL",
  "report:read": "OWN",
};

const FINANCE_PERMS: RoleMatrix = {
  "client:export": "ALL",
  "service:read": "ALL",
  "professional:read": "ALL",
  "professional:pay_data": "ALL",
  "inventory:read": "ALL",
  "inventory:cost": "ALL",
  "finance:read": "ALL",
  "finance:write": "ALL",
  "commission:read": "ALL",
  "report:read": "ALL",
  "report:financial": "ALL",
};

const READONLY_PERMS: RoleMatrix = {
  "client:read": "ALL",
  "appointment:read": "ALL",
  "service:read": "ALL",
  "inventory:read": "ALL",
  "marketing:read": "ALL",
  "report:read": "ALL",
};

const ROLE_MATRIX: Record<Role, RoleMatrix> = {
  OWNER: OWNER_PERMS,
  MANAGER: MANAGER_PERMS,
  PROFESSIONAL: PROFESSIONAL_PERMS,
  RECEPTIONIST: RECEPTIONIST_PERMS,
  FINANCE: FINANCE_PERMS,
  READONLY: READONLY_PERMS,
};

/** Quem está a agir. Construído a partir da sessão, nunca do input do cliente. */
export interface Actor {
  userId: string;
  unitId: string;
  role: Role;
  /** Preenchido apenas se o utilizador for também uma profissional. */
  professionalId: string | null;
  grants: string[];
  revokes: string[];
}

/** Escopo efetivo do actor para uma permissão, já com grants/revokes aplicados. */
export function scopeOf(actor: Actor, permission: Permission): Scope {
  if (actor.revokes.includes(permission)) return "NONE";
  if (actor.grants.includes(permission)) return "ALL";
  return ROLE_MATRIX[actor.role][permission] ?? "NONE";
}

/** Tem pelo menos escopo `OWN`? */
export function can(actor: Actor, permission: Permission): boolean {
  return scopeOf(actor, permission) !== "NONE";
}

/** Tem escopo total (`ALL`)? */
export function canAll(actor: Actor, permission: Permission): boolean {
  return scopeOf(actor, permission) === "ALL";
}

/** Atira `ForbiddenError` se não puder. Usar no topo de cada serviço. */
export function assertCan(actor: Actor, permission: Permission): void {
  if (!can(actor, permission)) throw new ForbiddenError(permission);
}

export function assertCanAll(actor: Actor, permission: Permission): void {
  if (!canAll(actor, permission)) throw new ForbiddenError(permission);
}

// ── Helpers de escopo ────────────────────────────────────────
// Devolvem cláusulas `where` do Prisma já filtradas por unidade E por escopo.
// Nenhum serviço deve construir estes filtros à mão.

/**
 * Sentinela para um actor com escopo OWN mas sem perfil de profissional.
 *
 * Nunca usar `null` aqui. Em Prisma, `ownerProfessionalId: null` significa
 * "onde o dono É NULO" — devolveria todas as fichas órfãs em vez de nenhuma.
 * Um ID que não existe garante conjunto vazio, que é o comportamento seguro.
 */
const NO_MATCH = "__none__";

function ownProfessionalId(actor: Actor): string {
  return actor.professionalId ?? NO_MATCH;
}

/**
 * Clientes visíveis ao actor.
 * Com escopo OWN, uma profissional vê as clientes de que é responsável e
 * aquelas que já atendeu — não vê a carteira das colegas.
 */
export function clientScope(actor: Actor): Prisma.ClientWhereInput {
  const scope = scopeOf(actor, "client:read");
  if (scope === "NONE") throw new ForbiddenError("client:read");

  const base = { unitId: actor.unitId, deletedAt: null };
  if (scope === "ALL") return base;

  const own = ownProfessionalId(actor);
  return {
    ...base,
    OR: [
      { ownerProfessionalId: own },
      { appointments: { some: { professionalId: own } } },
    ],
  };
}

export function appointmentScope(actor: Actor): Prisma.AppointmentWhereInput {
  const scope = scopeOf(actor, "appointment:read");
  if (scope === "NONE") throw new ForbiddenError("appointment:read");

  const base = { unitId: actor.unitId, deletedAt: null };
  if (scope === "ALL") return base;

  return { ...base, professionalId: ownProfessionalId(actor) };
}

export function professionalScope(actor: Actor): Prisma.ProfessionalWhereInput {
  const scope = scopeOf(actor, "professional:read");
  if (scope === "NONE") throw new ForbiddenError("professional:read");

  const base = { unitId: actor.unitId, deletedAt: null };
  if (scope === "ALL") return base;

  return { ...base, id: ownProfessionalId(actor) };
}

export function commissionScope(actor: Actor): Prisma.CommissionWhereInput {
  const scope = scopeOf(actor, "commission:read");
  if (scope === "NONE") throw new ForbiddenError("commission:read");

  const base = { unitId: actor.unitId };
  if (scope === "ALL") return base;

  return { ...base, professionalId: ownProfessionalId(actor) };
}

/**
 * O actor pode tocar neste registo concreto?
 * Usar depois de carregar, para bloquear acesso por ID direto (o caso que a
 * filtragem de listas não apanha).
 */
export function assertOwns(
  actor: Actor,
  permission: Permission,
  ownerProfessionalId: string | null | undefined,
): void {
  const scope = scopeOf(actor, permission);
  if (scope === "NONE") throw new ForbiddenError(permission);
  if (scope === "ALL") return;
  if (ownerProfessionalId !== actor.professionalId) {
    throw new ForbiddenError(permission);
  }
}

/** Lista legível de permissões de um papel. Para o ecrã de gestão de utilizadores. */
export function permissionsOf(role: Role): Permission[] {
  return Object.keys(ROLE_MATRIX[role]) as Permission[];
}

export const ROLE_LABELS: Record<Role, string> = {
  OWNER: "Proprietária",
  MANAGER: "Gestora",
  PROFESSIONAL: "Profissional",
  RECEPTIONIST: "Rececionista",
  FINANCE: "Financeiro",
  READONLY: "Apenas leitura",
};
