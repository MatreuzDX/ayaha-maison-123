import Link from "next/link";

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <Link
      href="/"
      aria-label="AYAHA MAISON — início"
      className="group inline-flex flex-col items-center leading-none"
    >
      <span
        className={`font-serif text-2xl font-normal tracking-[0.35em] transition-colors ${
          light ? "text-ivory" : "text-onyx"
        }`}
      >
        AYAHA
      </span>
      <span className="mt-1 flex items-center gap-2">
        <span className="bg-gold h-px w-4" />
        <span
          className={`text-[0.55rem] tracking-[0.4em] uppercase ${
            light ? "text-gold-light" : "text-gold-deep"
          }`}
        >
          Maison
        </span>
        <span className="bg-gold h-px w-4" />
      </span>
    </Link>
  );
}
