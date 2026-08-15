import Link from "next/link";
import { Logo } from "./Logo";
import { WhatsappButton } from "./WhatsappButton";
import { NAV, SITE, WA_MESSAGES } from "@/lib/site-config";
import { whatsappLink } from "@/lib/format";

export function Footer() {
  return (
    <footer className="bg-onyx text-ivory mt-24">
      <div className="container-luxe py-16">
        <div className="grid gap-12 md:grid-cols-4">
          <div className="md:col-span-1">
            <Logo light />
            <p className="text-ivory/60 mt-6 max-w-xs text-sm leading-relaxed">
              Uma maison dedicada à arte do olhar. Extensão de cílios com
              técnica, higiene e sofisticação.
            </p>
          </div>

          <div>
            <h3 className="eyebrow text-gold-light">Navegação</h3>
            <ul className="mt-5 space-y-3 text-sm">
              {NAV.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="text-ivory/70 hover:text-gold-light transition">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="eyebrow text-gold-light">Atendimento</h3>
            <ul className="text-ivory/70 mt-5 space-y-3 text-sm">
              <li>Atendimento a domicílio</li>
              <li>
                {SITE.baseArea} · {SITE.serviceArea}
              </li>
              <li>{SITE.hours}</li>
              <li>
                <a
                  href={whatsappLink(SITE.whatsapp, WA_MESSAGES.duvidas)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-gold-light transition"
                >
                  WhatsApp {SITE.whatsappDisplay}
                </a>
              </li>
              <li>
                <a href={`mailto:${SITE.email}`} className="hover:text-gold-light transition">
                  {SITE.email}
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="eyebrow text-gold-light">Experiência</h3>
            <p className="text-ivory/70 mt-5 text-sm">
              Reserve o seu horário e viva a experiência AYAHA MAISON, no
              conforto da sua casa.
            </p>
            <WhatsappButton message={WA_MESSAGES.agendar} className="btn-gold mt-5">
              Agendar pelo WhatsApp
            </WhatsappButton>
            <a
              href={SITE.social.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="border-ivory/20 text-ivory/80 hover:border-gold hover:text-gold-light mt-6 inline-flex items-center gap-3 rounded-full border px-5 py-2.5 text-sm transition"
            >
              <InstagramIcon />
              {SITE.social.instagramHandle}
            </a>
          </div>
        </div>

        <div className="border-ivory/10 text-ivory/50 mt-14 flex flex-col items-center justify-between gap-4 border-t pt-8 text-xs md:flex-row">
          <p>© {new Date().getFullYear()} AYAHA MAISON. Todos os direitos reservados.</p>
          <Link href="/contato" className="hover:text-gold-light transition">
            Contacto
          </Link>
        </div>
      </div>
    </footer>
  );
}

/** Glifo do Instagram, desenhado à mão — evita depender de uma biblioteca de ícones. */
export function InstagramIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="2" y="2" width="20" height="20" rx="5.5" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="17.6" cy="6.4" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}
