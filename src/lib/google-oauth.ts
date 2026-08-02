/**
 * Cliente OAuth 2.0 do Google, escrito à mão — sem Auth.js nem outra
 * biblioteca. É só troca de código por token e um pedido ao userinfo do
 * Google; não vale a pena trazer uma dependência nova para isto.
 */

import { createHmac, timingSafeEqual } from "node:crypto";

const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const USERINFO_ENDPOINT = "https://openidconnect.googleapis.com/v1/userinfo";

function clientId(): string {
  const id = process.env.GOOGLE_CLIENT_ID;
  if (!id) throw new Error("GOOGLE_CLIENT_ID não configurado.");
  return id;
}

function clientSecret(): string {
  const secret = process.env.GOOGLE_CLIENT_SECRET;
  if (!secret) throw new Error("GOOGLE_CLIENT_SECRET não configurado.");
  return secret;
}

export function googleRedirectUri(origin: string): string {
  return `${origin}/api/auth/callback/google`;
}

export function buildGoogleAuthUrl(origin: string, state: string): string {
  const url = new URL(AUTH_ENDPOINT);
  url.searchParams.set("client_id", clientId());
  url.searchParams.set("redirect_uri", googleRedirectUri(origin));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state);
  url.searchParams.set("access_type", "online");
  url.searchParams.set("prompt", "select_account");
  return url.toString();
}

interface GoogleTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface GoogleProfile {
  sub: string;
  email: string;
  email_verified: boolean;
  given_name?: string;
  family_name?: string;
  name?: string;
  picture?: string;
}

/**
 * Troca o código de autorização por um perfil verificado.
 *
 * Em vez de decodificar o `id_token` (JWT) manualmente — o que exigiria
 * validar a assinatura RS256 contra as chaves públicas do Google — pede o
 * perfil diretamente ao endpoint `userinfo` do Google com o `access_token`
 * que acabámos de obter. É mais simples e igualmente seguro: o token só
 * existe porque nós, com o client_secret, o trocámos por um código que só
 * o Google emitiu.
 */
export async function exchangeCodeForProfile(
  code: string,
  origin: string,
): Promise<GoogleProfile> {
  const tokenRes = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId(),
      client_secret: clientSecret(),
      redirect_uri: googleRedirectUri(origin),
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    throw new Error(`Falha ao trocar código Google: ${await tokenRes.text()}`);
  }

  const tokens = (await tokenRes.json()) as GoogleTokenResponse;

  const profileRes = await fetch(USERINFO_ENDPOINT, {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });

  if (!profileRes.ok) {
    throw new Error(`Falha ao obter perfil Google: ${await profileRes.text()}`);
  }

  return (await profileRes.json()) as GoogleProfile;
}

// ── Cookie de registo pendente ──────────────────────────────────
//
// Quando uma conta nova precisa do telefone (o Google não o dá) guardamos o
// perfil verificado num cookie curto até a pessoa o preencher. Assinado com
// HMAC usando o próprio client secret do Google — nunca sai do servidor — para
// que ninguém possa editar o cookie no browser e fingir um `googleId` que não
// é seu. Sem isto, essa pessoa poderia mais tarde ser "adotada" pela conta
// falsa quando o verdadeiro dono desse `googleId` tentasse entrar.

export interface PendingGoogleSignup {
  googleId: string;
  email: string;
  firstName: string;
  lastName?: string;
}

function sign(payload: string): string {
  return createHmac("sha256", clientSecret())
    .update(payload)
    .digest("base64url");
}

export function signPendingSignup(data: PendingGoogleSignup): string {
  const json = Buffer.from(JSON.stringify(data)).toString("base64url");
  return `${json}.${sign(json)}`;
}

export function verifyPendingSignup(token: string): PendingGoogleSignup | null {
  const [json, sig] = token.split(".");
  if (!json || !sig) return null;

  const expected = sign(json);
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expected);
  if (
    sigBuf.length !== expectedBuf.length ||
    !timingSafeEqual(sigBuf, expectedBuf)
  ) {
    return null;
  }

  try {
    return JSON.parse(
      Buffer.from(json, "base64url").toString("utf8"),
    ) as PendingGoogleSignup;
  } catch {
    return null;
  }
}
