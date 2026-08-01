import type { Metadata } from "next";
import { requireClientPage } from "@/server/client-auth";

export const metadata: Metadata = { title: "A minha conta" };

/**
 * Ponto de chegada mínimo. O conteúdo de verdade — fidelidade, marcações,
 * encomendas — entra na próxima etapa da unificação, quando o site público
 * for portado para aqui. Isto existe para o login único ter para onde
 * mandar uma cliente, e para se poder testar o mecanismo ponta a ponta.
 */
export default async function ContaPage() {
  const session = await requireClientPage();

  return (
    <div className="space-y-4">
      <h1 className="font-[family-name:var(--font-cormorant)] text-3xl text-[var(--text)]">
        Olá, {session.name}
      </h1>
      <p className="text-[var(--text-muted)]">
        A sua área de cliente está a ser construída. Em breve vai poder ver
        aqui as suas marcações, o cartão AYAHA Club e as suas encomendas.
      </p>
    </div>
  );
}
