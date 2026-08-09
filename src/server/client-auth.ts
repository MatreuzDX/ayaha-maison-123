/**
 * Autenticação de clientes — portal self-service.
 *
 * Espelha `auth.ts` de propósito (mesmo padrão de token opaco + hash SHA-256,
 * mesmo cookie httpOnly), mas fica num ficheiro à parte porque é um domínio de
 * confiança diferente: uma cliente nunca deve poder, por acidente de código,
 * acabar com um `Actor` de equipa. Separar os ficheiros torna essa garantia
 * óbvia de rever — não é preciso ler as duas lógicas misturadas para saber
 * que uma não empresta poderes à outra.
 *
 * Reutiliza `hashPassword`/`verifyPassword` de `auth.ts`: é a mesma pessoa
 * (Argon2id) a fazer o trabalho difícil, não uma segunda implementação.
 */

import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "./db";
import { hashPassword, verifyPassword, getRequestInfo } from "./auth";
import { ValidationError } from "./errors";

const COOKIE_NAME = "ayaha_client_session";
const SESSION_DAYS = 30;

const GENERIC_ERROR = new ValidationError(
  "E-mail ou palavra-passe incorretos.",
);

function generateToken(): string {
  return randomBytes(32).toString("base64url");
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export interface ClientSessionInfo {
  clientId: string;
  accountId: string;
  unitId: string;
  name: string;
  /** `false` = conta pendente de aprovação da equipa; ver `approvedAt`. */
  approved: boolean;
}

// ── Registo ──────────────────────────────────────────────────

/**
 * Cria conta de acesso para uma cliente.
 *
 * Se já existir uma ficha de cliente com o mesmo telefone nesta unidade
 * (criada pela equipa, sem conta online), a conta liga-se a essa ficha em vez
 * de criar uma duplicada — é a mesma pessoa, só está a passar a ter acesso
 * direto ao que já tínhamos sobre ela.
 */
export async function registerClient(input: {
  unitId: string;
  firstName: string;
  lastName?: string;
  email: string;
  phone: string;
  password: string;
}): Promise<ClientSessionInfo> {
  const email = input.email.trim().toLowerCase();
  const phone = input.phone.trim();

  const existingAccount = await prisma.clientAccount.findUnique({
    where: { email },
  });
  if (existingAccount) {
    throw new ValidationError("Já existe uma conta com este e-mail.");
  }

  const passwordHash = await hashPassword(input.password);

  const result = await prisma.$transaction(async (tx) => {
    let client = await tx.client.findFirst({
      where: { unitId: input.unitId, phone, deletedAt: null },
    });

    // Telefone já conhecido da equipa → é alguém que já é cliente, entra
    // logo aprovada. Ficha nova (nunca vista) → fica pendente até a equipa
    // aprovar; é o que impede qualquer pessoa de se registar e ter acesso
    // imediato a marcações sem a equipa saber quem é.
    const isNewClient = !client;

    if (!client) {
      client = await tx.client.create({
        data: {
          unitId: input.unitId,
          firstName: input.firstName,
          lastName: input.lastName,
          email,
          phone,
          status: "LEAD",
          source: "WEBSITE",
        },
      });
    } else if (!client.email) {
      // Aproveita para preencher o e-mail na ficha, se estava em falta.
      await tx.client.update({ where: { id: client.id }, data: { email } });
    }

    const account = await tx.clientAccount.create({
      data: {
        clientId: client.id,
        email,
        passwordHash,
        approvedAt: isNewClient ? null : new Date(),
      },
    });

    return { client, account };
  });

  return startSession(
    result.account.id,
    result.client.id,
    input.unitId,
    result.client.firstName,
    result.account.approvedAt !== null,
  );
}

// ── Login ────────────────────────────────────────────────────

export async function loginClient(
  email: string,
  password: string,
): Promise<ClientSessionInfo> {
  const normalizedEmail = email.trim().toLowerCase();

  const account = await prisma.clientAccount.findUnique({
    where: { email: normalizedEmail },
    include: {
      client: { select: { id: true, unitId: true, firstName: true } },
    },
  });

  if (!account || !account.passwordHash) {
    // Trabalho constante mesmo sem conta, para não revelar existência pelo
    // tempo de resposta — mesmo truque que o login da equipa já usa.
    await verifyPassword(
      "$argon2id$v=19$m=19456,t=2,p=1$c29tZXNhbHQ$RdescudvJCsgt3ub+b+dWRWJTmaaJObG",
      password,
    ).catch(() => false);
    throw GENERIC_ERROR;
  }

  const valid = await verifyPassword(account.passwordHash, password);
  if (!valid) throw GENERIC_ERROR;

  await prisma.clientAccount.update({
    where: { id: account.id },
    data: { lastLoginAt: new Date() },
  });

  return startSession(
    account.id,
    account.client.id,
    account.client.unitId,
    account.client.firstName,
    account.approvedAt !== null,
  );
}

async function startSession(
  accountId: string,
  clientId: string,
  unitId: string,
  name: string,
  approved: boolean,
): Promise<ClientSessionInfo> {
  const requestInfo = await getRequestInfo();
  const token = generateToken();
  const expires = new Date(Date.now() + SESSION_DAYS * 86_400_000);

  await prisma.clientSession.create({
    data: {
      sessionToken: hashToken(token),
      clientAccountId: accountId,
      expires,
      ip: requestInfo.ip,
      userAgent: requestInfo.userAgent,
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires,
  });

  return { clientId, accountId, unitId, name, approved };
}

// ── Login com Google ────────────────────────────────────────

/**
 * Liga (ou inicia sessão de) uma conta a partir de um perfil Google já
 * verificado pelo `exchangeCodeForProfile`.
 *
 * Três casos, por esta ordem:
 * 1. Já existe conta com este `googleId` → é a mesma pessoa, entra.
 * 2. Existe conta com este e-mail mas sem `googleId` (criada por password) →
 *    liga o Google a essa conta em vez de criar uma duplicada.
 * 3. Nenhuma das duas → não há telefone no perfil Google e o `Client` exige
 *    um, por isso devolve `needsPhone: true` em vez de criar já a conta;
 *    quem chama guarda o perfil num cookie curto e pede o telefone antes de
 *    concluir com `completeGoogleSignup`.
 */
export async function loginOrLinkGoogle(profile: {
  googleId: string;
  email: string;
  firstName: string;
  lastName?: string;
}): Promise<
  { needsPhone: true } | ({ needsPhone: false } & ClientSessionInfo)
> {
  const email = profile.email.trim().toLowerCase();

  const byGoogleId = await prisma.clientAccount.findUnique({
    where: { googleId: profile.googleId },
    include: {
      client: { select: { id: true, unitId: true, firstName: true } },
    },
  });
  if (byGoogleId) {
    await prisma.clientAccount.update({
      where: { id: byGoogleId.id },
      data: { lastLoginAt: new Date() },
    });
    const session = await startSession(
      byGoogleId.id,
      byGoogleId.client.id,
      byGoogleId.client.unitId,
      byGoogleId.client.firstName,
      byGoogleId.approvedAt !== null,
    );
    return { needsPhone: false, ...session };
  }

  const byEmail = await prisma.clientAccount.findUnique({
    where: { email },
    include: {
      client: { select: { id: true, unitId: true, firstName: true } },
    },
  });
  if (byEmail) {
    await prisma.clientAccount.update({
      where: { id: byEmail.id },
      data: { googleId: profile.googleId, lastLoginAt: new Date() },
    });
    const session = await startSession(
      byEmail.id,
      byEmail.client.id,
      byEmail.client.unitId,
      byEmail.client.firstName,
      byEmail.approvedAt !== null,
    );
    return { needsPhone: false, ...session };
  }

  return { needsPhone: true };
}

/**
 * Conclui o registo iniciado por Google depois de a pessoa indicar o
 * telefone (o Google não o fornece). Mesma lógica de ligação por telefone
 * existente do `registerClient` — se já houver ficha com esse número na
 * unidade, liga-se a ela em vez de duplicar.
 */
export async function completeGoogleSignup(input: {
  unitId: string;
  googleId: string;
  email: string;
  firstName: string;
  lastName?: string;
  phone: string;
}): Promise<ClientSessionInfo> {
  const email = input.email.trim().toLowerCase();
  const phone = input.phone.trim();

  const existingAccount = await prisma.clientAccount.findUnique({
    where: { email },
  });
  if (existingAccount) {
    throw new ValidationError("Já existe uma conta com este e-mail.");
  }

  const result = await prisma.$transaction(async (tx) => {
    let client = await tx.client.findFirst({
      where: { unitId: input.unitId, phone, deletedAt: null },
    });

    const isNewClient = !client;

    if (!client) {
      client = await tx.client.create({
        data: {
          unitId: input.unitId,
          firstName: input.firstName,
          lastName: input.lastName,
          email,
          phone,
          status: "LEAD",
          source: "WEBSITE",
        },
      });
    } else if (!client.email) {
      await tx.client.update({ where: { id: client.id }, data: { email } });
    }

    const account = await tx.clientAccount.create({
      data: {
        clientId: client.id,
        email,
        googleId: input.googleId,
        approvedAt: isNewClient ? null : new Date(),
      },
    });

    return { client, account };
  });

  return startSession(
    result.account.id,
    result.client.id,
    input.unitId,
    result.client.firstName,
    result.account.approvedAt !== null,
  );
}

export async function logoutClient(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (token) {
    await prisma.clientSession
      .delete({ where: { sessionToken: hashToken(token) } })
      .catch(() => {});
  }

  cookieStore.delete(COOKIE_NAME);
}

// ── Leitura da sessão ────────────────────────────────────────

export async function getClientSession(): Promise<ClientSessionInfo | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const session = await prisma.clientSession.findUnique({
    where: { sessionToken: hashToken(token) },
    include: {
      clientAccount: {
        include: {
          client: {
            select: {
              id: true,
              unitId: true,
              firstName: true,
              deletedAt: true,
            },
          },
        },
      },
    },
  });

  if (!session || session.expires < new Date()) return null;
  if (session.clientAccount.client.deletedAt) return null;

  return {
    clientId: session.clientAccount.client.id,
    accountId: session.clientAccount.id,
    unitId: session.clientAccount.client.unitId,
    name: session.clientAccount.client.firstName,
    approved: session.clientAccount.approvedAt !== null,
  };
}

/** Como `getClientSession`, mas redireciona para o login se não houver sessão. */
export async function requireClientPage(): Promise<ClientSessionInfo> {
  const session = await getClientSession();
  if (session) return session;
  redirect("/login");
}

/**
 * Como `requireClientPage`, mas exige também a conta aprovada.
 *
 * É o guarda das páginas internas do portal. A verificação é feita no
 * servidor, em cada página — não basta esconder o menu, porque escrever o
 * endereço à mão contorna qualquer coisa que só exista no browser.
 */
export async function requireApprovedClientPage(): Promise<ClientSessionInfo> {
  const session = await getClientSession();
  if (!session) redirect("/login");
  if (!session.approved) redirect("/conta");
  return session;
}
