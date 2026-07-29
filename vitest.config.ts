import { defineConfig } from "vitest/config";

export default defineConfig({
  // Resolução nativa dos paths do tsconfig (`@/*`) — dispensa vite-tsconfig-paths.
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    include: ["tests/**/*.{test,spec}.ts"],
    setupFiles: ["tests/env.ts"],
    // Os testes de integração partilham a base de dados. A correr em paralelo,
    // criariam marcações umas por cima das outras e a constraint de exclusão
    // faria falhar testes que estão corretos.
    fileParallelism: false,
    // Arrancar o Prisma e montar a fixture leva mais do que os 5 s por defeito.
    testTimeout: 30_000,
    hookTimeout: 30_000,
    coverage: {
      provider: "v8",
      // A spec exige >= 85% na camada de serviço — é onde vive o dinheiro,
      // a agenda e as permissões. O resto é UI e não conta para a meta.
      include: ["src/server/services/**", "src/lib/**"],
      thresholds: { lines: 85, functions: 85, branches: 75, statements: 85 },
    },
  },
});
