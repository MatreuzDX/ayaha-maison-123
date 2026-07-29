import { NextResponse, type NextRequest } from "next/server";

/**
 * Primeira barreira de acesso.
 *
 * A partir do Next.js 16 esta convenção chama-se `proxy` (antes `middleware`).
 * O comportamento é o mesmo.
 *
 * Corre no edge runtime e **não** tem acesso ao Prisma, por isso limita-se a
 * verificar a presença do cookie. A validação a sério — sessão existe, não
 * expirou, utilizador ativo — é feita por `getActor()` no layout de `(app)`,
 * que corre em Node e fala com a base de dados.
 *
 * Esta separação é deliberada: evita um round-trip inútil ao servidor para
 * quem claramente não tem sessão, sem prometer garantias de segurança que
 * este runtime não pode cumprir.
 */

const COOKIE_NAME = "ayaha_session";
const PUBLIC_PATHS = ["/login", "/recuperar"];

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasCookie = request.cookies.has(COOKIE_NAME);
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  if (!hasCookie && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    // Guardar para onde ia, para o devolver lá depois de entrar.
    if (pathname !== "/") url.searchParams.set("proximo", pathname);
    return NextResponse.redirect(url);
  }

  // Repare-se que NÃO se faz o inverso — quem tem cookie não é empurrado para
  // fora do /login. Um cookie cuja sessão já não existe (expirou, foi revogada,
  // ou a base foi recriada) passaria essa verificação: o /login mandava-o para
  // "/", "/" mandava-o de volta para /login, e a pessoa ficava presa num ciclo
  // sem forma de entrar. Só a página de login sabe validar a sessão a sério,
  // porque fala com a base — por isso é ela que decide se já está autenticado.

  const response = NextResponse.next();

  // Cabeçalhos de segurança (spec secção 29). O CSP fica para a Fase 8, quando
  // se souber que scripts externos entram (mapas, analytics).
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(self), microphone=(), geolocation=(self)",
  );

  return response;
}

export const config = {
  matcher: [
    // Tudo exceto ficheiros estáticos, imagens otimizadas e o favicon.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
