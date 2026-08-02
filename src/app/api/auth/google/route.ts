import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { buildGoogleAuthUrl } from "@/lib/google-oauth";

/**
 * Passo 1 do login com Google: manda para o ecrã de consentimento.
 *
 * Guarda um valor aleatório num cookie curto e no `state` enviado ao Google —
 * o callback compara os dois. Protege contra CSRF (alguém a forçar o browser
 * de outra pessoa a completar um login que nunca pediu).
 */

const STATE_COOKIE = "ayaha_oauth_state";

function isClientPath(path: string): boolean {
  return path.startsWith("/conta");
}

export function GET(request: NextRequest) {
  const proximoRaw = request.nextUrl.searchParams.get("proximo") ?? "";
  const proximo = isClientPath(proximoRaw) ? proximoRaw : "";

  const csrf = randomBytes(16).toString("base64url");
  const state = Buffer.from(JSON.stringify({ csrf, proximo })).toString(
    "base64url",
  );

  const response = NextResponse.redirect(
    buildGoogleAuthUrl(request.nextUrl.origin, state),
  );
  response.cookies.set(STATE_COOKIE, csrf, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return response;
}
