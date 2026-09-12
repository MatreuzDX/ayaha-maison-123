/**
 * Prepara o banco de produção durante o build da Vercel, antes do `next build`.
 *
 * 1. Aplica as migrações pendentes (`prisma migrate deploy`).
 * 2. Corre o seed, que é idempotente: catálogo, zonas, AYAHA Club e — se
 *    SEED_OWNER_EMAIL e SEED_OWNER_PASSWORD estiverem definidas — a conta de
 *    administração. Nunca cria clientes nem equipa inventadas.
 *
 * Vive em prisma/ e não em scripts/ porque o .vercelignore exclui scripts/ do
 * upload — o primeiro deploy (12/09/2026) falhou com MODULE_NOT_FOUND por isso.
 *
 * Porquê no build: a migração tem de entrar em produção ANTES do código que
 * depende dela (ver AYAHA-SKILLS/deploy-vercel-seguro). Se falhar, o build
 * falha e a Vercel mantém o deploy anterior no ar.
 *
 * Quando o banco não responde, o deploy só segue se for seguro — ver
 * `podeSeguirSemBanco()`. O site público aguenta-se sem banco (mostra o
 * catálogo base, `src/lib/catalog.ts`); o que não pode acontecer é código que
 * precisa de uma migração nova ir para o ar sem ela.
 *
 * Só corre em produção. Deploys de pré-visualização partilham o mesmo banco,
 * e um ramo experimental não pode mexer no schema de produção.
 */

import { execSync, spawnSync } from "node:child_process";

const naVercel = Boolean(process.env.VERCEL);
const ambiente = process.env.VERCEL_ENV;

if (naVercel && ambiente !== "production") {
  console.log(`preparar-banco: ambiente "${ambiente}" — migrações e seed saltados.`);
  process.exit(0);
}

if (process.env.DEMO_MODE === "true" || process.env.SEED_DEMO_CLIENTS === "true") {
  console.error(
    "\npreparar-banco: DEMO_MODE/SEED_DEMO_CLIENTS ligados em produção — recusado.\n" +
      "Isso encheria o banco real de clientes inventadas.\n",
  );
  process.exit(1);
}

// Sem banco nenhum não há schema com que o código possa ficar desalinhado, por
// isso o deploy segue: o site público mostra o catálogo base e o CRM avisa que
// falta o banco. Uma variável que falta não deve partir o build (ver
// AYAHA-SKILLS/deploy-vercel-seguro §5).
if (!process.env.DATABASE_URL) {
  console.warn(
    "\n⚠ preparar-banco: DATABASE_URL não está definida — migrações e seed saltados.\n" +
      "  O site público vai mostrar o catálogo base; login e CRM não funcionam.\n" +
      "  Resolver: Vercel → projeto → Storage → Create Database → ligar ao projeto → Redeploy.\n",
  );
  process.exit(0);
}

/** Erros de "não consigo chegar ao banco" — não de SQL nem de migração. */
const ERRO_DE_LIGACAO =
  /P1001|P1017|ENOTFOUND|ECONNREFUSED|ETIMEDOUT|EAI_AGAIN|tenant\/user .* not found|Can't reach database server/i;

/**
 * O servidor respondeu, e disse que o banco NÃO EXISTE — não é uma falha
 * passageira. Um banco que não existe não tem schema que possa ficar atrás do
 * código, por isso é o mesmo caso que não haver DATABASE_URL: segue com aviso.
 *
 * Só entram aqui respostas definitivas. `ENOTFOUND` sozinho fica de fora (uma
 * falha de DNS pode ser passageira); `tenant/user ... not found` é o pooler do
 * Supabase a dizer que o projeto foi apagado — foi o que aconteceu a 12/09/2026.
 */
const BANCO_INEXISTENTE =
  /tenant\/user .* not found|P1003|database ".*" does not exist/i;

/**
 * Com o banco inalcançável, seguir só se este deploy não trouxer migrações
 * novas em relação ao último deploy de produção bem-sucedido
 * (`VERCEL_GIT_PREVIOUS_SHA`). Se não der para confirmar — variável em falta,
 * commit anterior fora do clone, git indisponível — não segue.
 */
function podeSeguirSemBanco() {
  const anterior = process.env.VERCEL_GIT_PREVIOUS_SHA;
  if (!anterior) {
    return { sim: false, porque: "sem VERCEL_GIT_PREVIOUS_SHA para comparar migrações" };
  }
  const existe = spawnSync("git", ["cat-file", "-e", `${anterior}^{commit}`], { encoding: "utf8" });
  if (existe.status !== 0) {
    return { sim: false, porque: `o commit anterior ${anterior.slice(0, 7)} não está no clone` };
  }
  const diff = spawnSync(
    "git",
    ["diff", "--name-only", anterior, "HEAD", "--", "prisma/migrations"],
    { encoding: "utf8" },
  );
  if (diff.status !== 0) {
    return { sim: false, porque: "git diff às migrações falhou" };
  }
  const novas = diff.stdout.trim();
  if (novas) {
    return { sim: false, porque: `este deploy traz migrações novas:\n${novas}` };
  }
  return { sim: true, porque: `nenhuma migração nova desde ${anterior.slice(0, 7)}` };
}

console.log("\npreparar-banco: a aplicar migrações");
const migrar = spawnSync("npx prisma migrate deploy", { shell: true, encoding: "utf8" });
process.stdout.write(migrar.stdout ?? "");
process.stderr.write(migrar.stderr ?? "");

if (migrar.status !== 0) {
  const saida = `${migrar.stdout}\n${migrar.stderr}`;
  if (!ERRO_DE_LIGACAO.test(saida)) {
    console.error("\npreparar-banco: a migração falhou — build parado.\n");
    process.exit(1);
  }

  if (BANCO_INEXISTENTE.test(saida)) {
    console.warn(
      "\n⚠ preparar-banco: o banco configurado NÃO EXISTE — migrações e seed saltados, o deploy segue.\n" +
        "  A DATABASE_URL aponta para um banco apagado. O site público vai mostrar o catálogo base;\n" +
        "  login e CRM não funcionam.\n" +
        "  Resolver: Vercel → Settings → Environment Variables → apagar a DATABASE_URL morta,\n" +
        "  e Storage → Create Database → ligar ao projeto → Redeploy.\n",
    );
    process.exit(0);
  }

  const decisao = podeSeguirSemBanco();
  if (!decisao.sim) {
    console.error(
      "\npreparar-banco: o banco não responde e não é seguro seguir — build parado.\n" +
        `  Motivo: ${decisao.porque}\n` +
        "  Resolver: ligar um banco que exista (Vercel → Storage) ou apagar a DATABASE_URL morta.\n",
    );
    process.exit(1);
  }

  console.warn(
    "\n⚠ preparar-banco: o banco não responde — migrações e seed saltados, o deploy segue.\n" +
      `  Seguro porque: ${decisao.porque}.\n` +
      "  O site público vai mostrar o catálogo base; login e CRM não funcionam.\n" +
      "  Resolver: Vercel → projeto → Storage → Create Database → ligar ao projeto → Redeploy.\n",
  );
  process.exit(0);
}

console.log("\npreparar-banco: a semear dados base");
execSync("npx tsx prisma/seed.ts", { stdio: "inherit" });
console.log("\npreparar-banco: banco pronto.\n");
