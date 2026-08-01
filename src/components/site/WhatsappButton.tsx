import { whatsappLink } from "@/lib/format";
import { SITE } from "@/lib/site-config";

/** Ícone oficial do WhatsApp, SVG inline — sem dependências externas. */
export function WhatsappIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M17.5 14.4c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.95 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51-.17-.01-.37-.01-.57-.01-.2 0-.52.07-.8.37-.27.3-1.05 1.02-1.05 2.5 0 1.47 1.07 2.89 1.22 3.09.15.2 2.11 3.22 5.1 4.51.71.31 1.27.49 1.7.63.72.23 1.37.2 1.88.12.57-.09 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.07-.13-.27-.2-.57-.35Z" />
      <path d="M12.05 2.1A9.9 9.9 0 0 0 2.15 12c0 1.74.46 3.44 1.32 4.94L2.05 22l5.2-1.36a9.86 9.86 0 0 0 4.8 1.22h.01A9.9 9.9 0 0 0 12.05 2.1Zm0 18.02a8.2 8.2 0 0 1-4.18-1.15l-.3-.18-3.1.81.83-3.02-.2-.31a8.2 8.2 0 1 1 7.15 4.05Z" />
    </svg>
  );
}

export function WhatsappButton({
  message,
  className = "",
  children,
}: {
  message?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={whatsappLink(SITE.whatsapp, message)}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
    >
      <WhatsappIcon className="h-4 w-4" />
      {children}
    </a>
  );
}
