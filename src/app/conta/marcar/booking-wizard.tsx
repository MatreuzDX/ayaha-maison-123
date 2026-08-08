"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { formatEUR } from "@/lib/money";
import { whatsappLink } from "@/lib/format";
import { SITE } from "@/lib/site-config";
import type {
  BookableProfessional,
  BookableService,
} from "@/server/client-booking";
import {
  confirmBookingAction,
  professionalsForServiceAction,
  slotsForDayAction,
  type ConfirmResult,
} from "./actions";

/**
 * Marcação em passos, só por botões.
 *
 * Não há campo de texto livre para data nem hora de propósito: com botões
 * não existe a hipótese de interpretar mal o que a cliente escreveu, e ela
 * só consegue escolher horas que estão mesmo livres.
 */

type Step = "servico" | "profissional" | "dia" | "hora" | "confirmar" | "feito";

/** `YYYY-MM-DD` — o formato que o servidor espera para o dia. */
function toDayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function nextDays(count: number): Date[] {
  const days: Date[] = [];
  const base = new Date();
  base.setUTCHours(0, 0, 0, 0);
  for (let i = 0; i < count; i += 1) {
    days.push(new Date(base.getTime() + i * 86_400_000));
  }
  return days;
}

const DIAS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const MESES = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
];

function labelDia(date: Date) {
  return {
    semana: DIAS[date.getUTCDay()],
    dia: date.getUTCDate(),
    mes: MESES[date.getUTCMonth()],
  };
}

function horaDe(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-PT", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Lisbon",
  });
}

function dataCompleta(iso: string) {
  return new Date(iso).toLocaleDateString("pt-PT", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Europe/Lisbon",
  });
}

function Passo({
  numero,
  titulo,
  children,
}: {
  numero: number;
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-2)] p-5">
      <h2 className="text-lg text-[var(--text)]">
        <span className="text-[var(--text-muted)]">{numero}.</span> {titulo}
      </h2>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function Escolhido({
  rotulo,
  valor,
  onChange,
}: {
  rotulo: string;
  valor: string;
  onChange: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3">
      <span className="text-sm">
        <span className="text-[var(--text-muted)]">{rotulo}: </span>
        <span className="font-medium text-[var(--text)]">{valor}</span>
      </span>
      <button
        type="button"
        onClick={onChange}
        className="text-sm text-[var(--accent)] underline"
      >
        Mudar
      </button>
    </div>
  );
}

export function BookingWizard({
  services,
  horizonDays,
  clientFirstName,
}: {
  services: BookableService[];
  horizonDays: number;
  clientFirstName: string;
}) {
  const [step, setStep] = useState<Step>("servico");
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [servico, setServico] = useState<BookableService | null>(null);
  const [profissionais, setProfissionais] = useState<BookableProfessional[]>(
    [],
  );
  const [profissional, setProfissional] = useState<BookableProfessional | null>(
    null,
  );
  const [dia, setDia] = useState<Date | null>(null);
  const [horas, setHoras] = useState<string[]>([]);
  const [hora, setHora] = useState<string | null>(null);
  const [notas, setNotas] = useState("");
  const [feito, setFeito] = useState<ConfirmResult["booked"] | null>(null);

  function escolherServico(s: BookableService) {
    setErro(null);
    setServico(s);
    setProfissional(null);
    setDia(null);
    setHora(null);
    startTransition(async () => {
      const r = await professionalsForServiceAction(s.id);
      if (r.error) return setErro(r.error);
      if (!r.professionals?.length) {
        return setErro(
          "Ainda não há profissional disponível para este serviço. Fale connosco pelo WhatsApp.",
        );
      }
      setProfissionais(r.professionals);
      setStep("profissional");
    });
  }

  function escolherProfissional(p: BookableProfessional) {
    setErro(null);
    setProfissional(p);
    setDia(null);
    setHora(null);
    setStep("dia");
  }

  function escolherDia(d: Date) {
    if (!servico || !profissional) return;
    setErro(null);
    setDia(d);
    setHora(null);
    startTransition(async () => {
      const r = await slotsForDayAction({
        serviceId: servico.id,
        professionalId: profissional.id,
        day: toDayKey(d),
      });
      if (r.error) return setErro(r.error);
      setHoras(r.slots ?? []);
      setStep("hora");
    });
  }

  function escolherHora(iso: string) {
    setErro(null);
    setHora(iso);
    setStep("confirmar");
  }

  function confirmar() {
    if (!servico || !profissional || !hora) return;
    setErro(null);
    startTransition(async () => {
      const r = await confirmBookingAction({
        serviceId: servico.id,
        professionalId: profissional.id,
        startAt: hora,
        notes: notas || undefined,
      });
      if (r.error) return setErro(r.error);
      setFeito(r.booked ?? null);
      setStep("feito");
    });
  }

  // ── Fim: resumo e envio para o WhatsApp ────────────────────
  if (step === "feito" && feito) {
    const resumo =
      `Olá, AYAHA MAISON! Sou a ${clientFirstName}. ` +
      `Acabei de pedir uma marcação no site: ${feito.serviceName} com ${feito.professionalName}, ` +
      `${dataCompleta(feito.startAt)} às ${horaDe(feito.startAt)}. ` +
      `(referência ${feito.code})`;

    return (
      <div className="space-y-4">
        <div className="rounded-[var(--radius)] border border-[var(--success)] bg-[var(--success-bg)] p-6">
          <h2 className="text-lg text-[var(--success)]">Pedido registado</h2>
          <p className="mt-2 text-sm text-[var(--text)]">
            {feito.serviceName} com {feito.professionalName},{" "}
            {dataCompleta(feito.startAt)} às {horaDe(feito.startAt)}.
          </p>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            A equipa vai confirmar consigo. Enquanto isso, aparece na sua conta
            como <strong>Pedida</strong>.
          </p>
        </div>

        <a
          href={whatsappLink(SITE.whatsapp, resumo)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-12 w-full items-center justify-center rounded-[var(--radius)] bg-[#25D366] text-sm font-medium text-white hover:opacity-90"
        >
          Avisar pelo WhatsApp
        </a>

        <Link
          href="/conta"
          className="block text-center text-sm text-[var(--text-muted)] underline hover:text-[var(--text)]"
        >
          Ver as minhas marcações
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {erro && (
        <div
          role="alert"
          className="rounded-[var(--radius)] border border-[var(--danger)] bg-[var(--danger-bg)] px-3 py-2.5 text-sm text-[var(--danger)]"
        >
          {erro}
        </div>
      )}

      {/* 1 — Serviço */}
      {servico && step !== "servico" ? (
        <Escolhido
          rotulo="Serviço"
          valor={`${servico.name} · ${formatEUR(servico.priceCents)}`}
          onChange={() => setStep("servico")}
        />
      ) : (
        <Passo numero={1} titulo="Que serviço quer?">
          <div className="grid gap-2 sm:grid-cols-2">
            {services.map((s) => (
              <button
                key={s.id}
                type="button"
                disabled={pending}
                onClick={() => escolherServico(s)}
                className="rounded-[var(--radius)] border border-[var(--border)] px-4 py-3 text-left hover:border-[var(--accent)] disabled:opacity-50"
              >
                <span className="block text-sm font-medium text-[var(--text)]">
                  {s.name}
                </span>
                <span className="mt-0.5 block text-xs text-[var(--text-muted)]">
                  {s.durationMin} min · {formatEUR(s.priceCents)}
                </span>
              </button>
            ))}
          </div>
        </Passo>
      )}

      {/* 2 — Profissional */}
      {profissional && step !== "profissional" && step !== "servico" ? (
        <Escolhido
          rotulo="Profissional"
          valor={profissional.displayName}
          onChange={() => setStep("profissional")}
        />
      ) : (
        step === "profissional" && (
          <Passo numero={2} titulo="Com quem?">
            <div className="grid gap-2 sm:grid-cols-2">
              {profissionais.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  disabled={pending}
                  onClick={() => escolherProfissional(p)}
                  className="rounded-[var(--radius)] border border-[var(--border)] px-4 py-3 text-sm font-medium text-[var(--text)] hover:border-[var(--accent)] disabled:opacity-50"
                >
                  {p.displayName}
                </button>
              ))}
            </div>
          </Passo>
        )
      )}

      {/* 3 — Dia */}
      {dia && step !== "dia" && (step === "hora" || step === "confirmar") ? (
        <Escolhido
          rotulo="Dia"
          valor={dataCompleta(dia.toISOString())}
          onChange={() => setStep("dia")}
        />
      ) : (
        step === "dia" && (
          <Passo numero={3} titulo="Que dia?">
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
              {nextDays(horizonDays).map((d) => {
                const l = labelDia(d);
                return (
                  <button
                    key={d.toISOString()}
                    type="button"
                    disabled={pending}
                    onClick={() => escolherDia(d)}
                    className="rounded-[var(--radius)] border border-[var(--border)] px-2 py-2 text-center hover:border-[var(--accent)] disabled:opacity-50"
                  >
                    <span className="block text-[0.65rem] text-[var(--text-muted)] uppercase">
                      {l.semana}
                    </span>
                    <span className="tabular block text-sm font-medium text-[var(--text)]">
                      {l.dia}
                    </span>
                    <span className="block text-[0.65rem] text-[var(--text-muted)]">
                      {l.mes}
                    </span>
                  </button>
                );
              })}
            </div>
          </Passo>
        )
      )}

      {/* 4 — Hora */}
      {hora && step === "confirmar" ? (
        <Escolhido
          rotulo="Hora"
          valor={horaDe(hora)}
          onChange={() => setStep("hora")}
        />
      ) : (
        step === "hora" && (
          <Passo numero={4} titulo="A que horas?">
            {pending ? (
              <p className="text-sm text-[var(--text-muted)]">
                A procurar horas livres…
              </p>
            ) : horas.length === 0 ? (
              <div className="space-y-3">
                <p className="text-sm text-[var(--text-muted)]">
                  Não há horas livres neste dia.
                </p>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setStep("dia")}
                >
                  Escolher outro dia
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                {horas.map((iso) => (
                  <button
                    key={iso}
                    type="button"
                    onClick={() => escolherHora(iso)}
                    className="tabular rounded-[var(--radius)] border border-[var(--border)] px-2 py-2.5 text-sm text-[var(--text)] hover:border-[var(--accent)]"
                  >
                    {horaDe(iso)}
                  </button>
                ))}
              </div>
            )}
          </Passo>
        )
      )}

      {/* 5 — Confirmar */}
      {step === "confirmar" && servico && profissional && hora && (
        <Passo numero={5} titulo="Confirmar">
          <div className="space-y-4">
            <div className="rounded-[var(--radius)] bg-[var(--surface)] p-4 text-sm">
              <p className="text-[var(--text)]">
                <strong>{servico.name}</strong> com {profissional.displayName}
              </p>
              <p className="mt-1 text-[var(--text-muted)]">
                {dataCompleta(hora)} às {horaDe(hora)} · {servico.durationMin}{" "}
                min
              </p>
              <p className="mt-1 text-[var(--text-muted)]">
                {formatEUR(servico.priceCents)}
                <span className="text-xs">
                  {" "}
                  (a deslocação, se houver, é confirmada pela equipa)
                </span>
              </p>
            </div>

            <div>
              <label
                htmlFor="notas"
                className="mb-1 block text-sm text-[var(--text)]"
              >
                Quer dizer alguma coisa? (opcional)
              </label>
              <textarea
                id="notas"
                rows={2}
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder="Alguma alergia, preferência, ou como chegar"
                className="w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--text-subtle)] focus:border-[var(--accent)] focus:outline-none"
              />
            </div>

            <Button type="button" onClick={confirmar} disabled={pending}>
              {pending ? "A registar…" : "Pedir esta marcação"}
            </Button>
          </div>
        </Passo>
      )}
    </div>
  );
}
