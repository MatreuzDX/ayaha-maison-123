import "dotenv/config";
import path from "node:path";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  migrations: {
    path: path.join("prisma", "migrations"),
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // As migrações precisam da ligação DIRETA à base, não do pooler. O banco
    // da Vercel (Neon) dá as duas: DATABASE_URL (pooler, usada pela app) e
    // DATABASE_URL_UNPOOLED (direta). Localmente só existe DATABASE_URL.
    url: process.env.DATABASE_URL_UNPOOLED || env("DATABASE_URL"),
  },
});
