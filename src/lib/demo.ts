/**
 * Modo demonstração.
 *
 * Liga atalhos que só fazem sentido enquanto o sistema está a ser construído:
 * botão de entrada rápida no login e palavras-passe curtas no seed.
 *
 * ─────────────────────────────────────────────────────────────
 * PORQUE ISTO NÃO É UM "LEMBRAR DE REMOVER DEPOIS"
 * ─────────────────────────────────────────────────────────────
 * O padrão habitual — deixar o botão e apagá-lo antes de publicar — falha
 * sempre, mais cedo ou mais tarde. Alguém esquece-se, e fica um sistema com
 * dados de clientes reais e um botão que entra sem palavra-passe.
 *
 * Aqui o modo demo **não pode** ir para produção: se `DEMO_MODE` estiver
 * ligado com `NODE_ENV=production`, a aplicação recusa-se a arrancar. Não é
 * um aviso nos logs, é uma falha dura.
 *
 * Para publicar: apagar `DEMO_MODE` do ambiente. Mais nada.
 */

const demoFlag = process.env.DEMO_MODE === "true";
const isProduction = process.env.NODE_ENV === "production";

if (demoFlag && isProduction) {
  throw new Error(
    [
      "",
      "╔══════════════════════════════════════════════════════════╗",
      "║  ARRANQUE RECUSADO — DEMO_MODE ligado em produção        ║",
      "╚══════════════════════════════════════════════════════════╝",
      "",
      "O modo demonstração permite entrar sem palavra-passe e aceita",
      "palavras-passe fracas. Num sistema com dados reais de clientes",
      "isso é uma falha de segurança grave — e RGPD.",
      "",
      "Para corrigir: remova DEMO_MODE das variáveis de ambiente.",
      "",
    ].join("\n"),
  );
}

/** Está o modo demonstração ativo? Nunca devolve `true` em produção. */
export const IS_DEMO = demoFlag && !isProduction;

/**
 * Comprimento mínimo de palavra-passe.
 * 10 caracteres é a regra real; em demo baixa para 6 para permitir
 * credenciais de teste fáceis de escrever.
 */
export const MIN_PASSWORD_LENGTH = IS_DEMO ? 6 : 10;
