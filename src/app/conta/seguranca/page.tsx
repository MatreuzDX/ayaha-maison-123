import type { Metadata } from "next";
import { requireApprovedClientPage } from "@/server/client-auth";
import { getAccountSecurity } from "@/server/client-portal";
import { MIN_PASSWORD_LENGTH } from "@/lib/demo";
import { Card, PortalHeading } from "../portal-ui";
import { PasswordForm } from "./password-form";

export const metadata: Metadata = { title: "Segurança" };
export const dynamic = "force-dynamic";

export default async function SegurancaPage() {
  const session = await requireApprovedClientPage();
  const conta = await getAccountSecurity(session.accountId);

  return (
    <div className="space-y-6">
      <PortalHeading title="Segurança" subtitle="Como entra na sua conta." />

      <Card className="space-y-3">
        <h2 className="font-[family-name:var(--font-cormorant)] text-xl text-[var(--text)]">
          A sua conta
        </h2>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-[0.68rem] tracking-[0.14em] text-[var(--text-muted)] uppercase">
              E-mail
            </dt>
            <dd className="mt-1 break-all text-[var(--text)]">{conta.email}</dd>
          </div>
          <div>
            <dt className="text-[0.68rem] tracking-[0.14em] text-[var(--text-muted)] uppercase">
              Como entra
            </dt>
            <dd className="mt-1 text-[var(--text)]">
              {conta.hasPassword && conta.hasGoogle
                ? "Palavra-passe ou Google"
                : conta.hasGoogle
                  ? "Google"
                  : "Palavra-passe"}
            </dd>
          </div>
          {conta.lastLoginAt && (
            <div>
              <dt className="text-[0.68rem] tracking-[0.14em] text-[var(--text-muted)] uppercase">
                Última entrada
              </dt>
              <dd className="mt-1 text-[var(--text)]">
                {conta.lastLoginAt.toLocaleDateString("pt-PT", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </dd>
            </div>
          )}
        </dl>
        {/* O e-mail é alterado pela equipa, não aqui: mudá-lo sozinha
            trocaria a chave de acesso à conta sem nada que o confirme. */}
        <p className="border-t border-[var(--border)] pt-3 text-xs text-[var(--text-subtle)]">
          Para alterar o e-mail, fale connosco pelo WhatsApp — assim garantimos
          que é mesmo a senhora a pedir.
        </p>
      </Card>

      <Card>
        <h2 className="font-[family-name:var(--font-cormorant)] text-xl text-[var(--text)]">
          Alterar palavra-passe
        </h2>
        {conta.hasPassword ? (
          <div className="mt-4">
            <PasswordForm minLength={MIN_PASSWORD_LENGTH} />
          </div>
        ) : (
          <p className="mt-3 text-sm text-[var(--text-muted)]">
            A sua conta entra pelo Google, por isso não tem palavra-passe aqui.
            Se quiser passar a ter uma, fale connosco.
          </p>
        )}
      </Card>
    </div>
  );
}
