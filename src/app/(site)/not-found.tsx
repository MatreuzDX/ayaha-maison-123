import Link from "next/link";

/**
 * 404 dentro do site público.
 *
 * Apanha as chamadas a `notFound()` feitas de dentro deste grupo — hoje,
 * na prática, um serviço que já não existe ou foi desativado no CRM
 * (`/servicos/um-slug-qualquer`). Ao contrário do 404 de raiz, esta
 * renderiza dentro do `(site)/layout.tsx`, por isso já vem com cabeçalho e
 * rodapé: quem escreveu mal o nome de um serviço tem o menu ali para
 * escolher o certo, que é o caminho mais provável.
 */
export default function SiteNotFound() {
  return (
    <div className="container-luxe flex flex-col items-center py-24 text-center md:py-32">
      <p className="eyebrow">Não encontrámos</p>

      <h1 className="heading-serif text-onyx mt-4 text-4xl md:text-5xl">
        Esta página mudou de sítio
      </h1>

      <div className="gold-divider mt-6" />

      <p className="text-onyx/60 mt-8 max-w-md leading-relaxed">
        Pode ter sido um serviço que saiu do menu, ou um link antigo. Veja
        as técnicas disponíveis — o seu olhar está lá algures.
      </p>

      <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
        <Link href="/servicos" className="btn-gold">
          Ver todos os serviços
        </Link>
        <Link href="/contato" className="btn-outline">
          Falar connosco
        </Link>
      </div>
    </div>
  );
}
