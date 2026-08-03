# Stack e ferramentas — AYAHA MAISON

**Levantamento feito a 4 de agosto de 2026.**

Este ficheiro existe para uma coisa: se amanhã começares um projeto parecido
(ou voltares a este depois de meses), abres isto, dás ao agente, e ele sabe o
que instalar, o que ligar e onde estão as armadilhas — sem repetires a
descoberta toda.

> **Como usar:** diz ao agente
> *"lê `docs/stack-2026-08-04/README.md` e prepara o ambiente"*.
> A secção [Arranque do zero](#arranque-do-zero) é a receita passo a passo.

---

## 1. O que a aplicação é

Uma só aplicação Next.js que serve **três públicos** por prefixo de rota:

| Zona | Prefixo | Quem entra | Cookie de sessão |
|---|---|---|---|
| Site público | tudo o resto | qualquer visitante | — |
| CRM interno | `/app` | equipa | `ayaha_session` |
| Portal da cliente | `/conta` | clientes | `ayaha_client_session` |

A separação é reforçada no servidor (`src/proxy.ts`), não só na interface.
Os dois mundos nunca partilham sessão nem layout — é deliberado, para ser
fácil auditar que uma cliente nunca ganha poderes de equipa por acidente.

---

## 2. Bibliotecas principais

Instalam-se todas com um `npm install` — estão no `package.json`. A lista
abaixo é para perceberes **porquê** cada uma está lá.

### Base
| Pacote | Para quê |
|---|---|
| `next` 16 | Framework. **Atenção:** a versão 16 mudou convenções face ao que a maioria dos modelos "sabe" — ver secção 6. |
| `react` / `react-dom` 19 | Interface. Server Components e Server Actions são o padrão aqui. |
| `typescript` | Tipos. `npm run typecheck` corre sem gerar ficheiros. |
| `tailwindcss` 4 | Estilos. Configuração vive no CSS, não em `tailwind.config.js`. |

### Base de dados
| Pacote | Para quê |
|---|---|
| `prisma` + `@prisma/client` 7 | ORM e migrações. |
| `@prisma/adapter-pg` + `pg` | Ligação ao Postgres. |
| `embedded-postgres` | Postgres local **sem Docker** — ver secção 6. |

### Formulários e validação
| Pacote | Para quê |
|---|---|
| `zod` | Validação de dados. |
| `react-hook-form` + `@hookform/resolvers` | Formulários complexos no cliente. |
| `libphonenumber-js` | Validar e normalizar telefones portugueses e internacionais. |

### Interface
| Pacote | Para quê |
|---|---|
| `lucide-react` | Ícones. |
| `class-variance-authority`, `clsx`, `tailwind-merge` | Variantes de componentes sem confusão de classes. |
| `recharts` | Gráficos dos relatórios. |
| `@tanstack/react-table` | Tabelas com ordenação e filtros. |
| `date-fns` + `date-fns-tz` | Datas no fuso `Europe/Lisbon`. |

### Segurança
| Pacote | Para quê |
|---|---|
| `@node-rs/argon2` | Hash de palavras-passe. Não trocar por bcrypt. |

### Ferramentas de desenvolvimento
`vitest` (testes), `eslint` + `eslint-config-next`, `prettier` +
`prettier-plugin-tailwindcss`, `tsx` (correr TypeScript direto), `dotenv`,
`cross-env`.

---

## 3. Serviços externos

| Serviço | Para quê | Onde se configura |
|---|---|---|
| **Supabase** | Postgres de produção | `DATABASE_URL` |
| **Vercel** | Alojamento e deploy | `npx vercel deploy --prod` |
| **Google Cloud** | Login com Google (OAuth) | `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` |
| **WhatsApp** | Canal principal com clientes | número em `src/lib/site-config.ts` |

### Variáveis de ambiente
Estão listadas em `.env.example`. As reais **nunca** entram no repositório —
vivem no `.env` local (ignorado pelo git) e nas definições do Vercel.

---

## 4. Ferramentas do agente (Claude Code)

O que esteve realmente em uso neste projeto, e para quê:

### Ligações (MCP) que valeram a pena
| Ligação | Usada para | Precisa de autorização? |
|---|---|---|
| **Vercel** | ver deploys, registos de erro em produção, definições de proteção | já ligada |
| **Supabase** | consultar e migrar a base de dados | já ligada |
| **Canva** | gerar imagens da marca (logo, gift card) | sim — pelas definições de conectores |
| **Google Agenda** | sincronizar marcações (ainda por implementar) | sim |

> As que pedem autorização não se ligam a meio de uma sessão automática —
> tens de as autorizar nas definições de conectores do claude.ai antes.

### Painel do navegador (Browser)
Serve para o agente abrir o site, clicar, preencher formulários e ler erros
de consola — é assim que se verifica trabalho sem te obrigar a testar tudo à
mão. Configurado em `.claude/launch.json`.

**Limitação observada a 2026-08-02:** o envio de formulários deixou de
funcionar a meio de uma sessão longa (nem o login passava), mesmo com o
código correto. Sintoma: o clique não gera pedido POST nenhum. Solução:
abrir separador novo, ou reiniciar. Se acontecer, **não assumir que o código
está partido** — confirmar de outra maneira antes de "corrigir" o que não
está mal.

### Capacidades usadas
- **Artefactos** — documentos visuais partilháveis (guia de fotos, estudo de
  fidelidade). Carrega a *skill* `artifact-design` antes de escrever a
  página.
- **Tarefas** — lista de trabalho visível, para não se perder o fio em
  sessões longas.
- **Memória** — factos do negócio que sobrevivem entre conversas
  (`~/.claude/projects/.../memory/`).

---

## 5. Arranque do zero

```bash
npm install
```

```bash
npm run db:start
```

```bash
npx prisma migrate dev
```

```bash
npm run db:seed
```

```bash
npm run dev
```

Antes de qualquer commit, os quatro que têm de passar:

```bash
npm run typecheck && npm run lint && npm test && npm run build:check
```

---

## 6. Armadilhas já pagas

Cada uma destas custou tempo. Ler antes de repetir.

**Next.js 16 não é o que os modelos "sabem".**
A convenção `middleware.ts` passou a `proxy.ts`. `params` e `searchParams`
são agora *promises* — é preciso `await`. Consultar
`node_modules/next/dist/docs/` antes de escrever, não a memória.

**Postgres local sem Docker.**
O Docker Desktop não arranca sem permissões de administrador nesta máquina.
Usa-se `embedded-postgres` na porta **5433** (`npm run db:start`).

**A base tem de ser criada em UTF8.**
O Windows herda WIN1252 e a migração rebenta com acentos.

**`null` nos helpers de escopo do Prisma significa "onde é nulo"**, não
"sem filtro". Confundir isto abre dados que deviam ficar fechados.

**Server Components não podem alterar cookies.**
Login e logout têm de viver em Server Actions ou Route Handlers.

**O código de erro do Postgres não está em `err.code` com Prisma 7.**

**`redirect()` dentro de uma Server Action** devolve um 303 mudo — a pessoa
perde o que escreveu sem perceber porquê. Preferir devolver uma mensagem de
erro e deixar o formulário preenchido.

**O deploy no Vercel pode não chegar ao endereço principal.**
`vercel deploy --prod` cria um endereço novo, mas o alias
`ayaha-crm.vercel.app` pode ficar preso num deploy anterior. **Confirmar
sempre** com `npx vercel alias ls` e, se preciso:

```bash
npx vercel alias set <deploy-novo> ayaha-crm.vercel.app
```

Isto já causou um problema real: uma rota temporária que eu julgava apagada
continuou acessível em produção durante horas, porque o alias apontava para
o deploy antigo que ainda a tinha.

**Rotas temporárias de manutenção são perigosas.**
Se for mesmo preciso criar uma (por exemplo, para aplicar uma migração sem
acesso direto à base), tem de ser: protegida por segredo, apagada logo a
seguir, **e confirmada como inacessível no endereço público** — não só no
código.

---

## 7. Onde está o resto

| Ficheiro | O que tem |
|---|---|
| `AGENTS.md` | Resumo operacional — é o que o agente lê primeiro. |
| `docs/ESPECIFICACAO.md` | Especificação completa (~17.500 palavras). Fonte de verdade. |
| `docs/DEPLOY.md` | Como publicar. |
| `docs/adr/` | Decisões de arquitetura e porquê. |
| `.env.example` | Todas as variáveis de ambiente necessárias. |
