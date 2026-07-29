/**
 * Aritmética monetária. TODO o dinheiro no sistema é `Int` em cêntimos.
 *
 * Regra inviolável (ADR-02): nunca usar Float para dinheiro. Uma soma de
 * 0.1 + 0.2 em vírgula flutuante dá 0.30000000000000004, e um erro de cêntimo
 * numa fatura destrói a confiança no sistema inteiro.
 *
 * Arredondamento: HALF-UP simétrico (0,5 afasta-se sempre do zero).
 *   1.5 →  2      -1.5 → -2
 *   2.5 →  3      -2.5 → -3
 * Escolhido por ser o que uma pessoa espera ao conferir contas à mão.
 */

/** Cêntimos. Alias semântico — o TypeScript não o distingue de Int, mas o leitor sim. */
export type Cents = number;

/** Basis points. 4000 = 40,00%. Evita decimais em percentagens. */
export type Bps = number;

const LOCALE = "pt-PT";

/** Arredondamento half-up simétrico. */
export function roundHalfUp(value: number): number {
  return value < 0 ? -Math.round(-value) : Math.round(value);
}

/** Aplica uma percentagem em basis points. `applyBps(3000, 4000)` = 1200 (40% de €30). */
export function applyBps(cents: Cents, bps: Bps): Cents {
  assertInt(cents, "applyBps:cents");
  return roundHalfUp((cents * bps) / 10_000);
}

/** Que percentagem (em bps) é `part` de `whole`. Devolve 0 se `whole` for 0. */
export function toBps(part: Cents, whole: Cents): Bps {
  if (whole === 0) return 0;
  return roundHalfUp((part / whole) * 10_000);
}

/** Soma segura. Rejeita não-inteiros para apanhar Floats que entraram por engano. */
export function sumCents(...values: Cents[]): Cents {
  let total = 0;
  for (const v of values) {
    assertInt(v, "sumCents");
    total += v;
  }
  return total;
}

/** Nunca deixa o resultado descer abaixo de zero. Usado em descontos. */
export function subtractFloor(cents: Cents, amount: Cents): Cents {
  assertInt(cents, "subtractFloor:cents");
  assertInt(amount, "subtractFloor:amount");
  return Math.max(0, cents - amount);
}

/**
 * IVA a partir de um valor SEM imposto.
 * Com a fundadora provavelmente na isenção do art. 53.º do CIVA, `vatBps` é 0
 * por defeito no schema. Ver Anexo A da especificação.
 */
export function vatOn(netCents: Cents, vatBps: Bps): Cents {
  return applyBps(netCents, vatBps);
}

/** Formata para apresentação: `formatEUR(3000)` → `"30,00 €"`. */
export function formatEUR(cents: Cents): string {
  return new Intl.NumberFormat(LOCALE, {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

/** Como `formatEUR` mas sem cêntimos quando são zero: `"30 €"`. Para gráficos e KPIs. */
export function formatEURCompact(cents: Cents): string {
  const hasCents = cents % 100 !== 0;
  return new Intl.NumberFormat(LOCALE, {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: hasCents ? 2 : 0,
  }).format(cents / 100);
}

/** `formatBps(4000)` → `"40%"`, `formatBps(1250)` → `"12,5%"`. */
export function formatBps(bps: Bps): string {
  return new Intl.NumberFormat(LOCALE, {
    style: "percent",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(bps / 10_000);
}

/**
 * Converte entrada humana em cêntimos. Aceita `"30"`, `"30,00"`, `"30.00"`,
 * `"30,00 €"`, `"1.234,56"`. Devolve `null` se não conseguir interpretar —
 * o chamador decide o que fazer, esta função não atira.
 */
export function parseEUR(input: string): Cents | null {
  const cleaned = input
    .replace(/[€\s ]/g, "")
    .replace(/\.(?=\d{3}(\D|$))/g, "") // separador de milhar pt-PT
    .replace(",", ".");
  if (cleaned === "" || !/^-?\d*\.?\d*$/.test(cleaned)) return null;
  const value = Number(cleaned);
  if (!Number.isFinite(value)) return null;
  return roundHalfUp(value * 100);
}

function assertInt(value: number, where: string): void {
  if (!Number.isInteger(value)) {
    throw new TypeError(
      `[money] ${where}: esperado inteiro em cêntimos, recebido ${value}. ` +
        `Dinheiro nunca pode ser Float (ver ADR-02).`,
    );
  }
}
