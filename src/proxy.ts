import { NextResponse, type NextRequest } from "next/server";

/**
 * Primeira barreira de acesso.
 *
 * A partir do Next.js 16 esta convenção chama-se `proxy` (antes `middleware`).
 * O comportamento é o mesmo.
 *
 * Corre no edge runtime e **não** tem acesso ao Prisma, por isso limita-se a
 * verificar a presença do cookie certo para cada zona. A validação a sério —
 * sessão existe, não expirou, conta ativa — é feita por `getActor()` (equipa)
 * ou `getClientSession()` (cliente) no layout de cada zona, que corre em Node
 * e fala com a base de dados.
 *
 * Esta separação é deliberada: evita um round-trip inútil ao servidor para
 * quem claramente não tem sessão, sem prometer garantias de segurança que
 * este runtime não pode cumprir.
 *
 * Modelo por omissão: PERMITE, protege só o que é conhecido.
 * -----------------------------------------------------------
 * Antes deste ficheiro negava tudo por omissão e abria exceções (login,
 * recuperação). Fazia sentido enquanto isto era só uma ferramenta interna.
 * Agora que a app também serve o site público — página inicial, serviços,
 * loja, galeria — negar por omissão obrigaria a lembrar de acrescentar cada
 * página nova à lista de exceções, e esquecer uma marcava-a como protegida
 * por engano. Em vez disso: só `/app` (equipa) e `/conta` (cliente) exigem
 * sessão; tudo o resto é público, sem precisar de ser listado.
 */

const STAFF_COOKIE = "ayaha_session";
const CLIENT_COOKIE = "ayaha_client_session";

const STAFF_PREFIX = "/app";
const CLIENT_PREFIX = "/conta";
/** Páginas dentro da zona da cliente que não exigem sessão — registo. */
const CLIENT_PUBLIC_PATHS = ["/conta/registar", "/conta/completar-perfil"];

export type Zone = "staff" | "client" | "public";

/**
 * `startsWith` puro apanhava `/contato` como se fosse `/conta` — mesmo
 * problema aconteceria com `/appropriado` vs `/app`. Exige que a seguir ao
 * prefixo venha uma "/" ou o fim da string, nunca outra letra.
 */
function startsWithSegment(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function zoneOf(pathname: string): Zone {
  if (CLIENT_PUBLIC_PATHS.some((p) => startsWithSegment(pathname, p)))
    return "public";
  if (startsWithSegment(pathname, STAFF_PREFIX)) return "staff";
  if (startsWithSegment(pathname, CLIENT_PREFIX)) return "client";
  return "public";
}

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const zone = zoneOf(pathname);

  if (zone === "public") {
    return applySecurityHeaders(NextResponse.next());
  }

  // Cada zona exige o SEU cookie, nunca o do outro. Como os nomes são
  // diferentes, a exclusão mútua não depende de nenhum if que se possa
  // esquecer — uma sessão de cliente cai sempre no caso "sem cookie" em
  // `/app`, e vice-versa em `/conta`. A garantia vem da separação, não de
  // uma condição a mais.
  const requiredCookie = zone === "staff" ? STAFF_COOKIE : CLIENT_COOKIE;
  const hasCookie = request.cookies.has(requiredCookie);

  if (!hasCookie) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("proximo", pathname);
    return NextResponse.redirect(url);
  }

  // Repare-se que NÃO se faz o inverso — quem tem o cookie certo não é
  // empurrado para fora do /login. Um cookie cuja sessão já não existe
  // (expirou, foi revogada, ou a base foi recriada) passaria essa
  // verificação: o /login mandava-o para o destino, o destino mandava-o de
  // volta para /login, e a pessoa ficava presa num ciclo sem forma de
  // entrar. Só a página de login sabe validar a sessão a sério, porque fala
  // com a base — por isso é ela que decide se já está autenticado, e para
  // onde.

  return applySecurityHeaders(NextResponse.next());
}

function applySecurityHeaders(response: NextResponse): NextResponse {
  // Cabeçalhos de segurança (spec secção 29). O CSP fica para quando se
  // souber que scripts externos entram (mapas, analytics, pagamentos).
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
