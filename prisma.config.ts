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
    // Em Supabase, apontar DATABASE_URL à ligação DIRETA (porta 5432) para as
    // migrações. A app em runtime pode usar o pooler (porta 6543).
    url: env("DATABASE_URL"),
  },
});
