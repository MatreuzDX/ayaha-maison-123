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
 * Só corre em produção. Deploys de pré-visualização partilham o mesmo banco,
 * e um ramo experimental não pode mexer no schema de produção.
 */

import { execSync } from "node:child_process";

const naVercel = Boolean(process.env.VERCEL);
const ambiente = process.env.VERCEL_ENV;

if (naVercel && ambiente !== "production") {
  console.log(`preparar-banco: ambiente "${ambiente}" — migrações e seed saltados.`);
  process.exit(0);
}

if (!process.env.DATABASE_URL) {
  console.error(
    "\npreparar-banco: DATABASE_URL não está definida.\n" +
      "Na Vercel: projeto → Storage → Create Database, e ligar ao projeto.\n",
  );
  process.exit(1);
}

if (process.env.DEMO_MODE === "true" || process.env.SEED_DEMO_CLIENTS === "true") {
  console.error(
    "\npreparar-banco: DEMO_MODE/SEED_DEMO_CLIENTS ligados em produção — recusado.\n" +
      "Isso encheria o banco real de clientes inventadas.\n",
  );
  process.exit(1);
}

function correr(titulo, comando) {
  console.log(`\npreparar-banco: ${titulo}`);
  execSync(comando, { stdio: "inherit" });
}

correr("a aplicar migrações", "npx prisma migrate deploy");
correr("a semear dados base", "npx tsx prisma/seed.ts");
console.log("\npreparar-banco: banco pronto.\n");
