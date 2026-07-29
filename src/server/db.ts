/**
 * Cliente Prisma (singleton).
 *
 * Prisma 7 usa driver adapters: a ligação é feita por `@prisma/adapter-pg`,
 * não pela `url` do schema. Em dev, o cliente é guardado em `globalThis` para
 * sobreviver ao hot reload do Next — sem isso, cada recarga abre um novo pool
 * e a base esgota as ligações em poucos minutos.
 */

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

declare global {
  var __prisma: PrismaClient | undefined;
}

function createClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL não está definida. Copie .env.example para .env e preencha.",
    );
  }

  const adapter = new PrismaPg({ connectionString });

  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["warn", "error"]
        : ["error"],
  });
}

export const prisma = globalThis.__prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__prisma = prisma;
}

/** Tipo do cliente dentro de uma transação. Os serviços recebem isto. */
export type PrismaTx = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends"
>;
