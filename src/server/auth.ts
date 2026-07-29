/**
 * Autenticação e sessões. Ver especificação secção 7.1.
 *
 * ADR-08 — Sessão própria em vez de Auth.js
 * -----------------------------------------
 * A spec previa Auth.js v5. Optámos por sessões próprias porque:
 *   1. Auth.js v5 ainda é beta e o projeto corre em Next 16 (muito recente);
 *      juntar dois alvos móveis num módulo de segurança é risco desnecessário.
 *   2. Não precisamos de OAuth. É login com e-mail e palavra-passe para uma
 *      equipa de 2 a 5 pessoas, sem registo público.
 *   3. O padrão usado aqui — token opaco aleatório guardado com hash na base,
 *      cookie httpOnly — é gestão de sessão, não criptografia caseira.
 *
 * O token que vai no cookie NUNCA é guardado em claro. Guardamos o SHA-256.
 * Assim, uma fuga da tabela `Session` não permite roubar sessões ativas.
 */

import { createHash, randomBytes } from "node:crypto";
import { hash as argonHash, verify as argonVerify } from "@node-rs/argon2";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { MIN_PASSWORD_LENGTH } from "@/lib/demo";
import { prisma } from "./db";
import { UnauthorizedError, ValidationError } from "./errors";
import type { Actor } from "./permissions";

const COOKIE_NAME = "ayaha_session";
const SESSION_DAYS = 30;
const IDLE_HOURS = 8;

/** Parâmetros OWASP para Argon2id (2024): 19 MiB, 2 iterações, paralelismo 1. */
const ARGON_OPTIONS = {
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
} as const;

const MAX_FAILED_LOGINS = 5;
const LOCKOUT_MINUTES = 15;

// ── Palavras-passe ───────────────────────────────────────────

export function hashPassword(plain: string): Promise<string> {
  if (plain.length < MIN_PASSWORD_LENGTH) {
    throw new ValidationError(
      `A palavra-passe tem de ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`,
    );
  }
  return argonHash(plain, ARGON_OPTIONS);
}

export async function verifyPassword(
  hashed: string,
  plain: string,
): Promise<boolean> {
  try {
    return await argonVerify(hashed, plain);
  } catch {
    return false;
  }
}

// ── Tokens de sessão ─────────────────────────────────────────

function generateToken(): string {
  return randomBytes(32).toString("base64url");
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

// ── Login ────────────────────────────────────────────────────

export interface LoginResult {
  userId: string;
  unitId: string;
  name: string;
}

/**
 * Autentica e abre sessão.
 *
 * Nota de segurança: a mensagem de erro é a mesma para "e-mail não existe" e
 * "palavra-passe errada". Distingui-las permitiria enumerar utilizadores.
 */
export async function login(
  email: string,
  password: string,
): Promise<LoginResult> {
  const requestInfo = await getRequestInfo();
  const normalizedEmail = email.trim().toLowerCase();

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    include: { units: { include: { unit: true } } },
  });

  const genericError = new ValidationError(
    "E-mail ou palavra-passe incorretos.",
  );

  if (!user || !user.passwordHash || !user.isActive || user.deletedAt) {
    // Trabalho constante mesmo sem utilizador, para não revelar existência pelo tempo.
    await argonVerify(
      "$argon2id$v=19$m=19456,t=2,p=1$c29tZXNhbHQ$RdescudvJCsgt3ub+b+dWRWJTmaaJObG",
      password,
    ).catch(() => false);
    throw genericError;
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const minutes = Math.ceil(
      (user.lockedUntil.getTime() - Date.now()) / 60_000,
    );
    throw new ValidationError(
      `Conta bloqueada por demasiadas tentativas. Tente daqui a ${minutes} min.`,
    );
  }

  const valid = await verifyPassword(user.passwordHash, password);

  if (!valid) {
    const failed = user.failedLogins + 1;
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLogins: failed,
        lockedUntil:
          failed >= MAX_FAILED_LOGINS
            ? new Date(Date.now() + LOCKOUT_MINUTES * 60_000)
            : null,
      },
    });
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "LOGIN_FAILED",
        entityType: "User",
        entityId: user.id,
        ip: requestInfo.ip,
        userAgent: requestInfo.userAgent,
      },
    });
    throw genericError;
  }

  const membership = user.units[0];
  if (!membership) {
    throw new ValidationError(
      "A sua conta não está associada a nenhuma unidade. Contacte a administração.",
    );
  }

  const token = generateToken();
  const expires = new Date(Date.now() + SESSION_DAYS * 86_400_000);

  await prisma.$transaction(async (tx) => {
    await tx.session.create({
      data: {
        sessionToken: hashToken(token),
        userId: user.id,
        unitId: membership.unitId,
        expires,
        ip: requestInfo.ip,
        userAgent: requestInfo.userAgent,
      },
    });
    await tx.user.update({
      where: { id: user.id },
      data: { failedLogins: 0, lockedUntil: null, lastLoginAt: new Date() },
    });
    await tx.auditLog.create({
      data: {
        unitId: membership.unitId,
        userId: user.id,
        action: "LOGIN",
        entityType: "User",
        entityId: user.id,
        ip: requestInfo.ip,
        userAgent: requestInfo.userAgent,
      },
    });
  });

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires,
  });

  return { userId: user.id, unitId: membership.unitId, name: user.name };
}

export async function logout(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (token) {
    const session = await prisma.session.findUnique({
      where: { sessionToken: hashToken(token) },
    });
    if (session) {
      await prisma.$transaction(async (tx) => {
        await tx.session.delete({ where: { id: session.id } });
        await tx.auditLog.create({
          data: {
            unitId: session.unitId,
            userId: session.userId,
            action: "LOGOUT",
            entityType: "Session",
            entityId: session.id,
          },
        });
      });
    }
  }

  cookieStore.delete(COOKIE_NAME);
}

/** Termina TODAS as sessões de um utilizador. Usar em mudança de palavra-passe. */
export async function logoutAllSessions(userId: string): Promise<void> {
  await prisma.session.deleteMany({ where: { userId } });
}

// ── Leitura da sessão ────────────────────────────────────────

/** Devolve o actor da sessão atual, ou `null` se não houver sessão válida. */
export async function getActor(): Promise<Actor | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { sessionToken: hashToken(token) },
    include: {
      user: {
        include: {
          units: true,
          professional: { select: { id: true } },
        },
      },
    },
  });

  if (!session || session.expires < new Date()) return null;
  if (!session.user.isActive || session.user.deletedAt) return null;

  // Expiração por inatividade: uma sessão parada há mais de 8 h morre, mesmo
  // que o prazo absoluto de 30 dias ainda não tenha passado.
  // `createdAt` é renovado por `touchSession` a cada navegação, pelo que aqui
  // funciona como "última atividade".
  const idleLimit = new Date(Date.now() - IDLE_HOURS * 3_600_000);
  if (session.createdAt < idleLimit) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }

  const membership =
    session.user.units.find((u) => u.unitId === session.unitId) ??
    session.user.units[0];
  if (!membership) return null;

  return {
    userId: session.user.id,
    unitId: membership.unitId,
    role: membership.role,
    professionalId: session.user.professional?.id ?? null,
    grants: membership.grants,
    revokes: membership.revokes,
  };
}

/**
 * Como `getActor`, mas atira se não houver sessão.
 *
 * Usar em Server Actions e rotas de API, onde um 401 é a resposta certa.
 * Em páginas usar `requireActorPage()`, que redireciona.
 */
export async function requireActor(): Promise<Actor> {
  const actor = await getActor();
  if (!actor) throw new UnauthorizedError();
  return actor;
}

/**
 * Actor para páginas: redireciona para o login em vez de atirar.
 *
 * O `proxy` só consegue ver se o cookie existe, não se a sessão ainda é
 * válida. Um cookie que sobreviveu à sessão — porque expirou, foi revogada ou
 * a base foi recriada — passa o proxy e chega aqui. Atirar nesse caso mostrava
 * um ecrã de erro; o correto é mandar a pessoa entrar de novo.
 *
 * O cookie obsoleto não é apagado aqui: o Next só permite alterar cookies em
 * Server Actions e Route Handlers, nunca em Server Components. Fica para o
 * próximo login sobrepor — o que é inofensivo desde que o `proxy` não trate
 * "tem cookie" como "está autenticado" (ver `src/proxy.ts`).
 */
export async function requireActorPage(): Promise<Actor> {
  const actor = await getActor();
  if (actor) return actor;
  redirect("/login");
}

/** Prolonga a sessão. Chamado pelo middleware a cada navegação. */
export async function touchSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return;
  await prisma.session
    .update({
      where: { sessionToken: hashToken(token) },
      data: { createdAt: new Date() },
    })
    .catch(() => {});
}

// ── Utilitários ──────────────────────────────────────────────

export async function getRequestInfo(): Promise<{
  ip: string | null;
  userAgent: string | null;
}> {
  try {
    const h = await headers();
    const forwarded = h.get("x-forwarded-for");
    return {
      ip: forwarded?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? null,
      userAgent: h.get("user-agent"),
    };
  } catch {
    return { ip: null, userAgent: null };
  }
}

/** Limpa sessões expiradas. Corre num cron diário. */
export async function purgeExpiredSessions(): Promise<number> {
  const { count } = await prisma.session.deleteMany({
    where: { expires: { lt: new Date() } },
  });
  return count;
}
