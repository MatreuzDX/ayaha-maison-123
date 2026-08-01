"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

type RevealVariant = "up" | "left" | "right" | "scale";

/** Anima a entrada de um bloco quando ele cruza a viewport. */
export function Reveal({
  children,
  delay = 0,
  variant = "up",
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  variant?: RevealVariant;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.12 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`reveal reveal-${variant} ${visible ? "is-visible" : ""} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}
