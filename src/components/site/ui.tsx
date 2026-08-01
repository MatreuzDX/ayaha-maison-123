export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  center = false,
  light = false,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  center?: boolean;
  light?: boolean;
}) {
  return (
    <div className={`${center ? "mx-auto text-center" : ""} max-w-2xl`}>
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <h2
        className={`heading-serif mt-3 text-4xl md:text-5xl ${light ? "text-ivory" : "text-onyx"}`}
      >
        {title}
      </h2>
      {subtitle && (
        <p
          className={`mt-5 text-base leading-relaxed ${light ? "text-ivory/70" : "text-onyx/60"}`}
        >
          {subtitle}
        </p>
      )}
      <div className={`gold-divider mt-6 ${center ? "mx-auto" : ""}`} />
    </div>
  );
}

export function Stars({
  rating,
  className = "",
}: {
  rating: number;
  className?: string;
}) {
  return (
    <div
      className={`flex gap-0.5 ${className}`}
      aria-label={`${rating} de 5 estrelas`}
    >
      {Array.from({ length: 5 }).map((_, i) => (
        <svg
          key={i}
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill={i < rating ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="1.2"
          className="text-gold"
          aria-hidden
        >
          <path
            d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.9 6.1 20.5l1.2-6.5L2.5 9.4l6.6-.9L12 2.5Z"
            strokeLinejoin="round"
          />
        </svg>
      ))}
    </div>
  );
}
