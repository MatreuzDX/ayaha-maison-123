# Decisões de arquitetura (ADR)

Registo das decisões que moldam o sistema e do porquê. Uma decisão sem o motivo
escrito volta a ser discutida daqui a seis meses.

| # | Decisão | Onde está documentada |
|---|---|---|
| 01 | Camada de serviço obrigatória | `docs/ESPECIFICACAO.md` §4.2 |
| 02 | Dinheiro em `Int` de cêntimos | `src/lib/money.ts` (cabeçalho) |
| 03 | Multi-tenant por `unitId` desde o dia 1 | `docs/ESPECIFICACAO.md` §4.2 |
| 04 | Soft delete universal | `docs/ESPECIFICACAO.md` §4.2 |
| 05 | `AuditLog` e `TimelineEvent` separados | `src/server/audit.ts` (cabeçalho) |
| 06 | Deslocação calculada e persistida em cache | `docs/ESPECIFICACAO.md` §4.2 |
| 07 | Sem RLS do Supabase na v1 | `docs/ESPECIFICACAO.md` §4.2 |
| 08 | Sessão própria em vez de Auth.js | `src/server/auth.ts` (cabeçalho) |
| 09 | Next.js 16 e Prisma 7 em vez de 15/6 | este ficheiro, abaixo |

---

## ADR-09 — Next.js 16 e Prisma 7

**Data:** 2026-07-28
**Estado:** aceite

### Contexto

A especificação escrita antes do arranque previa Next.js 15 e Prisma 6. Ao
inicializar o projeto, as versões correntes eram Next.js 16.2.12 e Prisma 7.9.1.

### Decisão

Adotar as versões correntes.

### Consequências

**Next.js 16**
- Turbopack é o bundler por defeito.
- `cookies()` e `headers()` são assíncronos (já era assim no 15).
- React 19 com `useActionState` em vez do antigo `useFormState`.

**Prisma 7 — a mudança com mais impacto**
- A `url` **saiu** do bloco `datasource` do `schema.prisma`. Passa a viver em
  `prisma.config.ts`.
- A ligação exige um **driver adapter**: usamos `@prisma/adapter-pg` sobre `pg`.
- Isto significa que exemplos de Prisma 6 encontrados online **não funcionam**
  aqui. Ver `src/server/db.ts` para o padrão correto.

### Alternativa rejeitada

Fixar Prisma 6 para ter documentação mais estável. Rejeitada porque o projeto
vai ser desenvolvido ao longo de muitas sessões e acabaria por ter de migrar de
qualquer maneira — melhor pagar esse custo agora, com o schema ainda a nascer,
do que com dados de clientes lá dentro.
