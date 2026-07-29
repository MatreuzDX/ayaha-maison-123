/**
 * Datas e fusos horários.
 *
 * Regra (ADR): tudo é guardado em UTC (`timestamptz`) e convertido para
 * `Europe/Lisbon` apenas na apresentação. Lisboa é WET/WEST (UTC+0 / UTC+1),
 * o que significa duas mudanças de hora por ano — a agenda tem de as suportar
 * sem criar nem perder marcações.
 */

import {
  addDays,
  addMinutes,
  differenceInMinutes,
  endOfDay,
  format,
  parseISO,
  startOfDay,
} from "date-fns";
import { pt } from "date-fns/locale";
import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";

export const TIMEZONE = "Europe/Lisbon";

/** Minutos desde a meia-noite. 540 = 09:00. Usado em horários de trabalho. */
export type MinuteOfDay = number;

// ── Conversão ────────────────────────────────────────────────

/** UTC → hora de parede em Lisboa. Para renderizar. */
export function toLisbon(date: Date): Date {
  return toZonedTime(date, TIMEZONE);
}

/** Hora de parede em Lisboa → UTC. Para gravar o que o utilizador escolheu. */
export function fromLisbon(date: Date): Date {
  return fromZonedTime(date, TIMEZONE);
}

/**
 * Constrói um instante UTC a partir de um dia e de minutos-do-dia em Lisboa.
 * É a função que traduz "dia 5 de agosto às 14:00" para o que vai na base.
 */
export function lisbonDayTimeToUtc(day: Date, minuteOfDay: MinuteOfDay): Date {
  const local = toLisbon(day);
  const wall = new Date(
    local.getFullYear(),
    local.getMonth(),
    local.getDate(),
    Math.floor(minuteOfDay / 60),
    minuteOfDay % 60,
    0,
    0,
  );
  return fromLisbon(wall);
}

/** Minutos desde a meia-noite de Lisboa para um instante UTC. */
export function utcToLisbonMinuteOfDay(date: Date): MinuteOfDay {
  const local = toLisbon(date);
  return local.getHours() * 60 + local.getMinutes();
}

/** 0 = Domingo … 6 = Sábado, no fuso de Lisboa. Alinha com `WorkingHour.weekday`. */
export function lisbonWeekday(date: Date): number {
  return toLisbon(date).getDay();
}

// ── Formatação (pt-PT) ───────────────────────────────────────

/** `"05/08/2026"` */
export function formatDate(date: Date): string {
  return formatInTimeZone(date, TIMEZONE, "dd/MM/yyyy", { locale: pt });
}

/** `"14:00"` */
export function formatTime(date: Date): string {
  return formatInTimeZone(date, TIMEZONE, "HH:mm", { locale: pt });
}

/** `"05/08/2026 14:00"` */
export function formatDateTime(date: Date): string {
  return formatInTimeZone(date, TIMEZONE, "dd/MM/yyyy HH:mm", { locale: pt });
}

/** `"5 de agosto de 2026"` */
export function formatDateLong(date: Date): string {
  return formatInTimeZone(date, TIMEZONE, "d 'de' MMMM 'de' yyyy", { locale: pt });
}

/** `"quarta-feira, 5 de agosto"` — cabeçalho da vista de dia. */
export function formatDayHeading(date: Date): string {
  return formatInTimeZone(date, TIMEZONE, "EEEE, d 'de' MMMM", { locale: pt });
}

/** `"09:00"` a partir de minutos-do-dia. Para grelhas de horário. */
export function formatMinuteOfDay(minute: MinuteOfDay): string {
  const h = Math.floor(minute / 60);
  const m = minute % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** `"1h30"`, `"45min"`, `"2h"` — durações legíveis. */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, "0")}`;
}

/** `"há 3 dias"`, `"em 2 semanas"`. Para timeline e listas de clientes. */
export function formatRelativeDays(date: Date, now = new Date()): string {
  const days = Math.round((date.getTime() - now.getTime()) / 86_400_000);
  if (days === 0) return "hoje";
  if (days === 1) return "amanhã";
  if (days === -1) return "ontem";
  const abs = Math.abs(days);
  const unit =
    abs < 7
      ? `${abs} dia${abs === 1 ? "" : "s"}`
      : abs < 30
        ? `${Math.round(abs / 7)} semana${Math.round(abs / 7) === 1 ? "" : "s"}`
        : abs < 365
          ? `${Math.round(abs / 30)} ${Math.round(abs / 30) === 1 ? "mês" : "meses"}`
          : `${Math.round(abs / 365)} ano${Math.round(abs / 365) === 1 ? "" : "s"}`;
  return days < 0 ? `há ${unit}` : `em ${unit}`;
}

// ── Intervalos ───────────────────────────────────────────────

/** Início do dia de Lisboa, em UTC. */
export function lisbonStartOfDay(date: Date): Date {
  return fromLisbon(startOfDay(toLisbon(date)));
}

/** Fim do dia de Lisboa, em UTC. */
export function lisbonEndOfDay(date: Date): Date {
  return fromLisbon(endOfDay(toLisbon(date)));
}

/** Dois intervalos sobrepõem-se? Semi-aberto `[start, end)` — tocar não é sobrepor. */
export function overlaps(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date,
): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export { addDays, addMinutes, differenceInMinutes, format, parseISO };
