import type { InputHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Label({
  htmlFor,
  children,
  required,
}: {
  htmlFor: string;
  children: ReactNode;
  required?: boolean;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-1.5 block text-sm font-medium text-[var(--text)]"
    >
      {children}
      {required && (
        <span className="ml-0.5 text-[var(--danger)]" aria-hidden="true">
          *
        </span>
      )}
    </label>
  );
}

export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-2)] px-3 text-sm text-[var(--text)]",
        "placeholder:text-[var(--text-subtle)]",
        "focus:border-[var(--accent)] focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-[var(--accent)]",
        "disabled:cursor-not-allowed disabled:opacity-60",
        "aria-[invalid=true]:border-[var(--danger)]",
        className,
      )}
      {...props}
    />
  );
}

/** Mensagem de erro do campo. Ligada por `aria-describedby` para leitores de ecrã. */
export function FieldError({ id, children }: { id: string; children?: ReactNode }) {
  if (!children) return null;
  return (
    <p id={id} role="alert" className="mt-1.5 text-sm text-[var(--danger)]">
      {children}
    </p>
  );
}

export function Hint({ children }: { children: ReactNode }) {
  return <p className="mt-1.5 text-sm text-[var(--text-muted)]">{children}</p>;
}
