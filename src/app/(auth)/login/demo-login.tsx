"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { demoLoginAction, type LoginState } from "./actions";

function DemoButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="secondary"
      className="w-full border-dashed"
      disabled={pending}
    >
      {pending ? "A entrar…" : "Entrar como demonstração"}
    </Button>
  );
}

/**
 * Atalho de desenvolvimento. Só é renderizado quando o servidor confirma que
 * está em modo demonstração — em produção este componente nem chega ao ecrã,
 * e a ação por trás dele recusa na mesma.
 */
export function DemoLogin({ email }: { email: string }) {
  const [state, formAction] = useActionState<LoginState, FormData>(
    demoLoginAction,
    {},
  );

  return (
    <div className="mt-4 border-t border-dashed border-[var(--border)] pt-4">
      <p className="mb-2 text-center text-xs text-[var(--text-muted)]">
        Modo demonstração — este atalho desaparece em produção
      </p>

      {state.error && (
        <div
          role="alert"
          className="mb-2 rounded-[var(--radius)] border border-[var(--danger)] bg-[var(--danger-bg)] px-3 py-2 text-sm text-[var(--danger)]"
        >
          {state.error}
        </div>
      )}

      <form action={formAction}>
        <DemoButton />
      </form>

      <p className="mt-2 text-center text-[11px] text-[var(--text-subtle)]">
        {email}
      </p>
    </div>
  );
}
