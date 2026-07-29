<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# AYAHA CRM — contexto para o agente

Ler `docs/ESPECIFICACAO.md` antes de escrever código. Este ficheiro é o resumo
operacional; a especificação é a fonte de verdade.

## O negócio em cinco linhas

**AYAHA MAISON** — extensão de cílios **exclusivamente ao domicílio**, base em
Benfica, Lisboa. Fundado por volta de 21/07/2025. Equipa alvo: 2 a 5
profissionais. Moeda EUR, locale pt-PT, fuso Europe/Lisbon. Canal principal:
WhatsApp `+351 933 055 502`.

**Sete serviços, todos a €30.** Não é erro de dados — é decisão de negócio.

| Serviço | Duração |
|---|---|
| Fio a Fio | 90 min |
| Volume Brasileiro | 120 min |
| Volume Russo | 120 min |
| Volume Egípcio | 120 min |
| Fox Eyes | 120 min |
| Efeito Gatinho | 90 min |
| Efeito Esquilo | 90 min |

**Fidelidade — AYAHA Club:** cartão de **5 carimbos** (1 por atendimento
concluído). Ao completar, a cliente escolhe 1 de 3 recompensas: €15 de
desconto, upgrade de técnica, ou gift card de €15. Depois recomeça.
**Não é um sistema de pontos.** Não introduzir pontos, níveis nem conversão
ponto→euro.

## Regras invioláveis

1. Lógica de negócio **só** em `src/server/services/`. Rotas e Server Actions
   validam input, chamam o serviço e formatam a resposta.
2. Toda a escrita grava `AuditLog` **na mesma transação** (`src/server/audit.ts`).
3. Toda a query filtra por `unitId` — usar sempre os helpers de escopo de
   `src/server/permissions.ts`, nunca `findMany` a seco.
4. Dinheiro é `Int` em cêntimos (`src/lib/money.ts`). Nunca `Float`. O helper
   atira se receber um não-inteiro.
5. Datas em UTC na base, `Europe/Lisbon` só na apresentação
   (`src/lib/datetime.ts`).
6. Textos da interface em **pt-PT**. Mensagens de erro acionáveis, não genéricas.
7. Percentagens em basis points (`4000` = 40%).

## Stack

Next.js 16 (App Router) · React 19 · TypeScript strict · Tailwind 4 ·
Prisma 7 + PostgreSQL · Vitest.

**Prisma 7 é diferente do 6:** a connection string vive em `prisma.config.ts`,
não no `schema.prisma`, e a ligação passa por driver adapter
(`@prisma/adapter-pg`). Ver `src/server/db.ts`.

**Autenticação é própria**, não Auth.js — ver ADR-08 no topo de
`src/server/auth.ts`. Argon2id + token opaco guardado com hash SHA-256 na
tabela `Session` + cookie httpOnly.

## Arranque

Não é preciso Docker nem direitos de administrador — o Postgres vem como
dependência npm (`embedded-postgres`) e corre a partir de `.pgdata/`.

```bash
npm install
npm run db:start              # Postgres local na porta 5433 (deixar a correr)
npm run db:deploy             # aplica migrações + constraints
npm run db:seed               # unidade, equipa, 7 serviços, zonas, clientes
npm run dev
```

`docker compose up -d` continua a funcionar como alternativa (porta 5432),
mas exige o Docker Desktop a correr.

## ⚠️ MODO DEMONSTRAÇÃO

Está **ligado** (`DEMO_MODE="true"` no `.env`). Enquanto estiver:

- o ecrã de login mostra o botão **"Entrar como demonstração"**;
- aceitam-se palavras-passe a partir de 6 caracteres.

As credenciais de entrada estão em `SEED_OWNER_EMAIL` e `SEED_OWNER_PASSWORD`
no ficheiro `.env` — que não é versionado. Não as copiar para aqui: o histórico
do Git é permanente, e um repositório privado hoje pode ser público amanhã.

**Não é preciso lembrar-se de remover isto antes de publicar.** Se `DEMO_MODE`
estiver ligado com `NODE_ENV=production`, a aplicação **recusa-se a arrancar** e
o build falha (ver `src/lib/demo.ts`). Para publicar, basta não definir a
variável no ambiente de produção.

Consequência prática: `npm run build` falha localmente enquanto o modo demo
estiver ligado — é suposto. Para verificar o build use `npm run build:check`,
que corre com `DEMO_MODE` vazio.

## Comandos

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção (falha se `DEMO_MODE` estiver ligado) |
| `npm run build:check` | Build com `DEMO_MODE` vazio — usar para verificar |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm test` | Vitest |
| `npm run db:start` | Arranca o Postgres local (fica em primeiro plano) |
| `npm run db:stop` | Pára o Postgres local |
| `npm run db:deploy` | Aplica migrações |
| `npm run db:seed` | Popular a base |
| `npm run db:studio` | Explorador visual da base |

## Estado

- ✅ **Fase 0** — fundações: schema, constraints SQL, autenticação, permissões.
- ✅ **Fase 1** — clientes (lista, ficha, criar, editar) e catálogo de serviços.
- ✅ **Fase 2** — equipa e horários (leitura na UI; edição no serviço).
- ✅ **Fase 3 (base)** — agenda com cálculo de deslocação; criar, cancelar e
  concluir marcação, com carimbo de fidelidade e abate de stock automáticos.
- ⬜ Fase 4 — financeiro e faturação (bloqueada pelo Anexo A)
- ⬜ Fases 5-8 — ver `docs/ESPECIFICACAO.md` secção 32

Publicar: ver `docs/DEPLOY.md`.

## Arquitetura em três camadas

```
Página / Server Action   →  lê input, chama o serviço, formata a resposta
src/server/services/     →  TODA a lógica: permissões, validação, transações
Prisma + constraints SQL →  última linha de defesa
```

Regra prática: se uma página importa `prisma` para **escrever**, está errada.
Ler diretamente é aceitável em consultas simples de apresentação, desde que
use os helpers de escopo de `src/server/permissions.ts`.

`requireActorPage()` nas páginas (redireciona), `requireActor()` nas Server
Actions e rotas de API (atira 401).

### Conflitos de agenda: HARD vs SOFT

`checkAvailability()` classifica a indisponibilidade:

- **HARD** — sobreposição física com outro atendimento, contando a estrada.
  **Ninguém força**, nem a proprietária: a constraint da base recusaria de
  qualquer forma, e uma pessoa não está em dois sítios ao mesmo tempo.
- **SOFT** — fora do horário, durante férias. Quem tem
  `appointment:override_conflict` pode forçar; é decisão da casa.

## Armadilhas conhecidas

- **`Intl` em pt-PT usa espaço não separável (U+00A0)** antes do `€`. Testes que
  comparem strings formatadas têm de normalizar.
- **pt-PT não separa milhar em números de 4 dígitos:** `formatEUR(150000)` dá
  `"1500,00 €"`, não `"1 500,00 €"`.
- **`departAt` nunca pode ser nulo.** É a base da constraint de exclusão que
  impede marcações geograficamente impossíveis. O serviço calcula-o sempre
  antes de gravar.
- **`Material.unit_`** mapeia para a coluna `unit` — `unit` colidia com a
  relação para `Unit`.
- **IVA está a 0** em todos os serviços: a fundadora está provavelmente na
  isenção do art. 53.º do CIVA. Confirmar antes da Fase 4.
- **O código SQLSTATE do Postgres não está em `err.code`** com o Prisma 7 e
  driver adapter — aí está o código do Prisma (`P2039`). O original fica em
  `meta.driverAdapterError.cause.code`. Ver `pgErrorCode()` em
  `appointment.service.ts`.
- **Server Components não podem alterar cookies.** Só Server Actions e Route
  Handlers. Por isso o `proxy` não expulsa quem tem cookie do `/login`: um
  cookie obsoleto criaria um ciclo infinito de redirecionamentos.
- **Nos helpers de escopo, `null` nunca significa "nenhum".** Em Prisma,
  `ownerProfessionalId: null` procura registos *sem dono*. Usar a sentinela
  `"__none__"` — há testes que fixam isto.
- **A base tem de ser UTF8.** Em Windows o `initdb` herda WIN1252 e a migração
  de constraints rebenta com os comentários acentuados.

## Decisões pendentes da fundadora

Ver `docs/ESPECIFICACAO.md` Anexo A. As que bloqueiam fases:

- **Fase 3:** taxas de deslocação reais, raio máximo, política de sinal e
  cancelamento.
- **Fase 4:** regime de IVA, percentagem de comissão, tipo de contrato das
  técnicas, software de faturação certificado.
- **Fase 5:** a recompensa "upgrade de técnica" não tem valor económico com
  preço único de €30 — decidir substituição.
