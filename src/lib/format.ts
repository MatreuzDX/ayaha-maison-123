/** Formatação de dados de negócio para apresentação. Tudo em pt-PT. */

import {
  isValidPhoneNumber,
  parsePhoneNumberFromString,
} from "libphonenumber-js";

const REGION = "PT";

// ── Telefones ────────────────────────────────────────────────

/**
 * Normaliza para E.164 (`+351933055502`) antes de gravar.
 * Aceita `"933 055 502"`, `"933055502"`, `"+351 933055502"`.
 * Devolve `null` se o número não for válido — o chamador decide.
 */
export function normalizePhone(input: string): string | null {
  const parsed = parsePhoneNumberFromString(input.trim(), REGION);
  return parsed?.isValid() ? parsed.number : null;
}

export function isValidPhone(input: string): boolean {
  try {
    return isValidPhoneNumber(input.trim(), REGION);
  } catch {
    return false;
  }
}

/** `"+351933055502"` → `"933 055 502"` (nacional) ou `"+34 600 000 000"` (estrangeiro). */
export function formatPhone(e164: string): string {
  const parsed = parsePhoneNumberFromString(e164);
  if (!parsed) return e164;
  return parsed.country === REGION
    ? parsed.formatNational()
    : parsed.formatInternational();
}

/** Link `wa.me` para abrir conversa de WhatsApp com texto opcional pré-preenchido. */
export function whatsappLink(e164: string, text?: string): string {
  const digits = e164.replace(/\D/g, "");
  const base = `https://wa.me/${digits}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}

// ── Nomes ────────────────────────────────────────────────────

export function fullName(firstName: string, lastName?: string | null): string {
  return lastName ? `${firstName} ${lastName}` : firstName;
}

/** Iniciais para avatares. `"Marta Silva"` → `"MS"`. */
export function initials(firstName: string, lastName?: string | null): string {
  const a = firstName.trim()[0] ?? "";
  const b = lastName?.trim()[0] ?? "";
  return (a + b).toUpperCase() || "?";
}

// ── Códigos legíveis ─────────────────────────────────────────

/**
 * Alfabeto sem caracteres ambíguos — sem 0/O, 1/I/L, 2/Z, 5/S.
 * Estes códigos são ditados ao telefone e escritos à mão em recibos.
 */
const UNAMBIGUOUS = "ABCDEFGHJKMNPQRTUVWXY346789";

export function randomCode(length: number): string {
  let out = "";
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < length; i++) {
    out += UNAMBIGUOUS[bytes[i]! % UNAMBIGUOUS.length];
  }
  return out;
}

/** `AYA-0508-K7P` — marcação. Inclui dia/mês para leitura humana rápida. */
export function appointmentCode(date: Date): string {
  const dd = String(date.getUTCDate()).padStart(2, "0");
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `AYA-${dd}${mm}-${randomCode(3)}`;
}

/** `AYA-GIFT-7K2M` — gift card. */
export function giftCardCode(): string {
  return `AYA-GIFT-${randomCode(4)}`;
}

/** `AYA-J8AU` — recompensa de fidelidade, apresentada no atendimento. */
export function rewardCode(): string {
  return `AYA-${randomCode(4)}`;
}

/** `2026/0042` — fatura. Sequencial por ano e unidade, nunca reutilizado. */
export function invoiceNumber(year: number, sequence: number): string {
  return `${year}/${String(sequence).padStart(4, "0")}`;
}

// ── Moradas ──────────────────────────────────────────────────

/** Código postal PT: `1500-123`. Aceita entrada sem hífen. */
export function normalizePostalCode(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  if (digits.length !== 7) return null;
  return `${digits.slice(0, 4)}-${digits.slice(4)}`;
}

export function isValidPostalCode(input: string): boolean {
  return normalizePostalCode(input) !== null;
}

/** Os 4 primeiros dígitos — é por aqui que se resolve a zona de deslocação. */
export function postalPrefix(postalCode: string): string | null {
  const normalized = normalizePostalCode(postalCode);
  return normalized ? normalized.slice(0, 4) : null;
}

export function formatAddress(parts: {
  addressLine?: string | null;
  addressExtra?: string | null;
  postalCode?: string | null;
  city?: string | null;
}): string {
  return [
    parts.addressLine,
    parts.addressExtra,
    [parts.postalCode, parts.city].filter(Boolean).join(" "),
  ]
    .filter((s) => s && s.trim() !== "")
    .join(", ");
}

/** Abre a morada no Google Maps — a profissional usa isto a caminho. */
export function mapsLink(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

// ── Números ──────────────────────────────────────────────────

export function formatNumber(value: number, decimals = 0): string {
  return new Intl.NumberFormat("pt-PT", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/** Quantidade de material com a sua unidade: `"0,05 ml"`. */
export function formatQuantity(value: number, unit: string): string {
  const decimals = Number.isInteger(value) ? 0 : 2;
  return `${formatNumber(value, decimals)} ${unit}`;
}

/** Slug seguro para URLs a partir de texto português (remove acentos). */
export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // remove diacríticos combinantes
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
