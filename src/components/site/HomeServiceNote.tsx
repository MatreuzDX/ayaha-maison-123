import { SITE } from "@/lib/site-config";

/**
 * Até 15/08/2026 este bloco descrevia um negócio exclusivamente a
 * domicílio. Desde 16/08/2026 há duas formas de atender — ver a nota em
 * `SITE.homeServiceNote` (site-config.ts) para o porquê.
 */

/* Ícones de traço desenhados à mão — sem bibliotecas de ícones, para não
   destoar da identidade da maison. */
function IconCasa() {
  return (
    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3.5 10.6 12 4l8.5 6.6" />
      <path d="M5.9 9.4V19a.9.9 0 0 0 .9.9h10.4a.9.9 0 0 0 .9-.9V9.4" />
      <path d="M10 19.9v-4.6h4v4.6" />
    </svg>
  );
}

function IconAgenda() {
  return (
    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3.6" y="5.6" width="16.8" height="14.8" rx="2.2" />
      <path d="M8.2 3.4v4M15.8 3.4v4M3.6 10.2h16.8" />
      <path d="M8.4 13.9h2.1M13.5 13.9h2.1M8.4 17.1h2.1M13.5 17.1h2.1" />
    </svg>
  );
}

function IconLocal() {
  return (
    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 20.8s6.6-5.4 6.6-10.4a6.6 6.6 0 1 0-13.2 0c0 5 6.6 10.4 6.6 10.4Z" />
      <circle cx="12" cy="10.2" r="2.4" />
    </svg>
  );
}

function IconDeslocamento() {
  return (
    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3.4 15.4v-2.3a2 2 0 0 1 .28-1.02l2.1-3.4A2 2 0 0 1 7.5 7.7h9a2 2 0 0 1 1.72.98l2.1 3.4a2 2 0 0 1 .28 1.02v2.3a.9.9 0 0 1-.9.9H4.3a.9.9 0 0 1-.9-.9Z" />
      <path d="M5.4 12.2h13.2" />
      <circle cx="7.9" cy="16.3" r="1.5" />
      <circle cx="16.1" cy="16.3" r="1.5" />
    </svg>
  );
}

const ITEMS = [
  { Icon: IconLocal, title: "No nosso espaço", text: `Em Benfica, na ${SITE.studio.full}.` },
  { Icon: IconCasa, title: "Ou na sua casa", text: "Se preferir, vamos até si — com todo o conforto e privacidade." },
  { Icon: IconAgenda, title: "Mediante agendamento", text: "Horários combinados previamente, de acordo com a sua disponibilidade." },
  { Icon: IconDeslocamento, title: "Deslocamento", text: "Só ao domicílio: poderá ter custo adicional conforme a distância." },
];

/** Bloco informativo do modelo de atendimento — espaço ou domicílio. */
export function HomeServiceNote({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="border-gold/30 bg-gold/5 text-onyx/70 rounded-2xl border p-5 text-sm">
        <span className="text-onyx font-medium">No espaço ou a domicílio.</span>{" "}
        {SITE.homeServiceNote}
      </div>
    );
  }

  return (
    <div className="border-onyx/10 rounded-3xl border bg-white p-8 shadow-[0_2px_20px_-12px_rgba(0,0,0,0.15)]">
      <div className="border-onyx/10 flex flex-col gap-2 border-b pb-6 text-center">
        <p className="eyebrow">Como funciona</p>
        <h3 className="heading-serif text-onyx text-2xl md:text-3xl">
          No nosso espaço, em Benfica, ou a domicílio
        </h3>
      </div>
      <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {ITEMS.map(({ Icon, title, text }) => (
          <div key={title} className="group text-center">
            <div className="border-gold/30 bg-gold/[0.07] text-gold-deep group-hover:border-gold/60 group-hover:bg-gold/15 mx-auto flex h-14 w-14 items-center justify-center rounded-full border transition-colors duration-300">
              <Icon />
            </div>
            <h4 className="text-onyx mt-4 font-medium tracking-wide">{title}</h4>
            <span className="bg-gold/40 mx-auto mt-2 block h-px w-6" />
            <p className="text-onyx/55 mt-3 text-sm leading-relaxed">{text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
