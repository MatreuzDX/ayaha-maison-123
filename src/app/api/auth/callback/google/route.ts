import { NextResponse, type NextRequest } from "next/server";
import { exchangeCodeForProfile, signPendingSignup } from "@/lib/google-oauth";
import { loginOrLinkGoogle } from "@/server/client-auth";

/**
 * Passo 2: o Google devolve aqui com um código. Troca-se por um perfil
 * verificado e decide-se entre três caminhos — ver `loginOrLinkGoogle` para
 * os dois primeiros. O terceiro (conta nova, falta telefone) guarda o perfil
 * num cookie assinado e manda para `/conta/completar-perfil`.
 */

const STATE_COOKIE = "ayaha_oauth_state";
const PENDING_COOKIE = "ayaha_google_pending";

function isClientPath(path: string): boolean {
  return path.startsWith("/conta");
}

function toLogin(origin: string, erro: string): NextResponse {
  const url = new URL("/login", origin);
  url.searchParams.set("erro", erro);
  const response = NextResponse.redirect(url);
  response.cookies.delete(STATE_COOKIE);
  return response;
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;

  if (searchParams.get("error")) {
    return toLogin(origin, "google");
  }

  const code = searchParams.get("code");
  const stateParam = searchParams.get("state");
  const cookieCsrf = request.cookies.get(STATE_COOKIE)?.value;

  if (!code || !stateParam || !cookieCsrf) {
    return toLogin(origin, "google");
  }

  let proximo = "";
  try {
    const decoded = JSON.parse(
      Buffer.from(stateParam, "base64url").toString("utf8"),
    ) as {
      csrf: string;
      proximo?: string;
    };
    if (decoded.csrf !== cookieCsrf) {
      return toLogin(origin, "google");
    }
    proximo = decoded.proximo ?? "";
  } catch {
    return toLogin(origin, "google");
  }

  let profile;
  try {
    profile = await exchangeCodeForProfile(code, origin);
  } catch (err) {
    console.error("[google-oauth:callback]", err);
    return toLogin(origin, "google");
  }

  if (!profile.email_verified) {
    return toLogin(origin, "google-email");
  }

  const firstName =
    profile.given_name?.trim() ||
    profile.name?.trim().split(" ")[0] ||
    "Cliente";
  const lastName = profile.family_name?.trim() || undefined;

  const result = await loginOrLinkGoogle({
    googleId: profile.sub,
    email: profile.email,
    firstName,
    lastName,
  });

  if (!result.needsPhone) {
    const destination = proximo && isClientPath(proximo) ? proximo : "/conta";
    const response = NextResponse.redirect(new URL(destination, origin));
    response.cookies.delete(STATE_COOKIE);
    return response;
  }

  const pendingToken = signPendingSignup({
    googleId: profile.sub,
    email: profile.email,
    firstName,
    lastName,
  });

  const response = NextResponse.redirect(
    new URL("/conta/completar-perfil", origin),
  );
  response.cookies.delete(STATE_COOKIE);
  response.cookies.set(PENDING_COOKIE, pendingToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return response;
}
