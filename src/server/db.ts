/**
 * Cliente Prisma (singleton).
 *
 * Prisma 7 usa driver adapters: a ligação é feita por `@prisma/adapter-pg`,
 * não pela `url` do schema. Em dev, o cliente é guardado em `globalThis` para
 * sobreviver ao hot reload do Next — sem isso, cada recarga abre um novo pool
 * e a base esgota as ligações em poucos minutos.
 *
 * O cliente só é criado à primeira consulta, não ao importar este ficheiro.
 * Criado no import, uma `DATABASE_URL` em falta rebentava qualquer página que
 * importasse (mesmo indiretamente) este módulo — e o `next build` também, que
 * importa os módulos das páginas ao recolher dados. Assim o erro só aparece a
 * quem tenta mesmo ler do banco, e o site público pode mostrar o catálogo base
 * (ver `src/server/public-content.ts`).
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
      "DATABASE_URL não está definida. Em produção: Vercel → Storage → criar o banco e ligá-lo ao projeto. Localmente: copiar .env.example para .env.",
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

function getClient(): PrismaClient {
  globalThis.__prisma ??= createClient();
  return globalThis.__prisma;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const client = getClient();
    const value = Reflect.get(client, property, client);
    return typeof value === "function" ? value.bind(client) : value;
  },
});

/** Tipo do cliente dentro de uma transação. Os serviços recebem isto. */
export type PrismaTx = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends"
>;
