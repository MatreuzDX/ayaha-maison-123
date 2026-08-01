/**
 * Partículas douradas a pairar sobre o hero. Puramente decorativo:
 * `aria-hidden` e `pointer-events-none`. As animações desligam-se sozinhas
 * para quem prefere menos movimento (ver globals.css).
 */
const SPARKLES = [
  { top: "18%", left: "12%", size: 6, anim: "animate-float", delay: "0s", dur: "7s", opacity: 0.5 },
  { top: "30%", left: "82%", size: 4, anim: "animate-drift", delay: "0.8s", dur: "9s", opacity: 0.4 },
  { top: "62%", left: "22%", size: 5, anim: "animate-drift", delay: "1.6s", dur: "11s", opacity: 0.45 },
  { top: "72%", left: "70%", size: 3, anim: "animate-float", delay: "0.4s", dur: "8s", opacity: 0.35 },
  { top: "44%", left: "48%", size: 4, anim: "animate-float", delay: "2.1s", dur: "10s", opacity: 0.3 },
  { top: "84%", left: "40%", size: 5, anim: "animate-drift", delay: "1.1s", dur: "12s", opacity: 0.4 },
];

export function HeroSparkles() {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-[5] overflow-hidden"
      aria-hidden
    >
      {SPARKLES.map((s, i) => (
        <span
          key={i}
          className={`bg-gold-light absolute rounded-full blur-[1px] ${s.anim}`}
          style={{
            top: s.top,
            left: s.left,
            width: `${s.size}px`,
            height: `${s.size}px`,
            opacity: s.opacity,
            animationDelay: s.delay,
            animationDuration: s.dur,
            boxShadow: "0 0 8px rgba(216, 195, 154, 0.6)",
          }}
        />
      ))}
    </div>
  );
}
