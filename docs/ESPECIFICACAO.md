# AYAHA MAISON — CRM PROFISSIONAL
## Especificação Técnica Completa v1.0

> **Documento de referência para implementação assistida por IA (Claude Code).**
> Data: 2026-07-27 · Locale alvo: `pt-PT` · Moeda: `EUR` · Fuso: `Europe/Lisbon`

---

# ÍNDICE

| # | Secção |
|---|---|
| 0 | Como usar este documento (modo de execução) |
| 1 | Contexto de negócio |
| 2 | Objetivos e não-objetivos |
| 3 | Pesquisa obrigatória antes de implementar |
| 4 | Stack técnica e decisões de arquitetura |
| 5 | Estrutura de pastas |
| 6 | Modelo de dados (schema Prisma completo) |
| 7 | Autenticação, papéis e permissões |
| 8 | Módulo 1 — CRM de Clientes |
| 9 | Módulo 2 — CRM de Funcionários |
| 10 | Módulo 3 — Serviços e catálogo |
| 11 | Módulo 4 — Agenda inteligente |
| 12 | Módulo 5 — Gestão de horários e disponibilidade |
| 13 | Módulo 6 — Gestão de deslocamento (domicílio) |
| 14 | Módulo 7 — Pipeline de atendimentos |
| 15 | Módulo 8 — Timeline e histórico |
| 16 | Módulo 9 — Lista de espera e reagendamento inteligente |
| 17 | Módulo 10 — Comunicações (WhatsApp + E-mail) |
| 18 | Módulo 11 — Fidelidade, Gift Cards e Cupões |
| 19 | Módulo 12 — Stock de materiais |
| 20 | Módulo 13 — Financeiro e fluxo de caixa |
| 21 | Módulo 14 — Comissões e pagamentos à equipa |
| 22 | Módulo 15 — Relatórios, dashboard e KPIs |
| 23 | Módulo 16 — Documentos, assinatura digital e RGPD |
| 24 | Módulo 17 — Logs de auditoria |
| 25 | Módulo 18 — Multi-unidade (preparado) |
| 26 | Regras de negócio transversais |
| 27 | Superfície de API |
| 28 | UI/UX e design system |
| 29 | Segurança |
| 30 | Testes e qualidade |
| 31 | Deploy e ambientes |
| 32 | Plano de execução por fases |
| 33 | Definition of Done |

---

# 0. COMO USAR ESTE DOCUMENTO

**Isto não é para ler de uma ponta à outra.** São ~2300 linhas: lê-las todas
gasta uma fatia enorme da janela de contexto e devolve sobretudo coisas já
construídas.

Este documento é o **porquê** — o raciocínio de negócio por trás de cada
módulo, escrito antes de existir código. Consulta-se **por secção**, quando
se vai mexer nesse módulo e é preciso perceber que decisão foi tomada e a
troco de quê.

Para trabalhar, ler por esta ordem:

| Ficheiro | O que dá |
|---|---|
| `AGENTS.md` | Regras invioláveis, stack, armadilhas, arranque |
| `docs/PROXIMO-PASSO.md` | **Estado atual e o que falta** |
| `prisma/schema.prisma` | O modelo de dados, a sério |
| este documento, **a secção que interessa** | O porquê daquele módulo |

O que era a secção 0 — divisão de trabalho entre modelos e regras de
implementação — saiu daqui em 10/08/2026. As regras estão em `AGENTS.md`,
que é lido automaticamente; tê-las nos dois sítios só garantia que um dia
divergiam.

---

# 1. CONTEXTO DE NEGÓCIO

## 1.1 A empresa

**AYAHA MAISON — Maison de Beleza · Extensão de Cílios**

- **Modelo:** atendimento **exclusivamente ao domicílio da cliente**. Não há salão físico.
- **Base de operações:** Benfica, Lisboa.
- **Área de cobertura:** Lisboa e arredores.
- **Idade do negócio:** fundado por volta de **21/07/2025** (~1 ano).
- **Equipa alvo:** 2 a 5 profissionais (a fundadora + técnicas).
- **Canal principal de contacto:** WhatsApp `+351 933 055 502`.
- **Moeda:** EUR. **Idioma:** pt-PT. **Fuso:** Europe/Lisbon.
- **Público:** mulheres em Lisboa que querem extensão de cílios premium em casa, 20–45 anos.

## 1.1.1 Sistema em produção hoje (o site)

Existe já um site Next.js 14 em `C:\Users\Mateus\Desktop\Site que o Cloud Code gerou pra mim`
(repo privado `MatreuzDX/ayaha-maison`), com 21 páginas, painel admin funcional
(serviços, cupões, benefícios, agendamentos) e store JSON em `.data/db.json`.

**Este CRM não substitui o site — é o backoffice a sério por trás dele.**
Consequências de arquitetura:

| Facto do site | Consequência para o CRM |
|---|---|
| Store JSON isolada em `store.ts`, desenhada para trocar por Postgres | O CRM cria o Postgres definitivo; o site passa a ler dele na Fase 6 |
| Auth com scrypt + cookie HMAC assinado | O CRM usa Argon2id; migração de passwords faz-se por reset forçado |
| Serviços com overrides por slug gravados na store | O CRM passa a ser a **fonte de verdade** dos serviços; o site consome |
| Cadastro e agendamento **não persistem** hoje | O CRM resolve isto: é ele que grava clientes e marcações |
| Fidelidade hoje é demo | O CRM implementa a contagem real de carimbos |

**Regra:** o CRM e o site partilham a mesma base de dados Postgres, mas são
aplicações separadas. O CRM escreve; o site sobretudo lê.

## 1.2 Por que um CRM e não uma agenda

O negócio a domicílio tem três problemas que uma agenda normal não resolve:

1. **O tempo de deslocação é tempo não faturável e invisível.** Duas marcações "seguidas" em Cascais e Olivais são fisicamente impossíveis. O CRM tem de saber isso e recusar a marcação.
2. **O material é consumido por serviço e ninguém repara até acabar.** Cola de cílios, fios, pinças, adesivos. Sem controlo de stock, a profissional descobre a falta em casa da cliente.
3. **A retenção é tudo.** Extensão de cílios vive de manutenções de 3 em 3 semanas. Quem não volta em 30 dias está perdido. O CRM tem de identificar isso automaticamente.

## 1.3 Personas

| Persona | Papel no sistema | O que precisa |
|---|---|---|
| **Ayaha (dona)** | `OWNER` | Ver tudo: faturação, comissões, quem está a produzir, quem está a perder clientes |
| **Técnica** | `PROFESSIONAL` | Ver só a sua agenda do dia, a morada seguinte, o histórico da cliente, registar o que consumiu |
| **Rececionista / apoio** | `RECEPTIONIST` | Marcar, remarcar, atender WhatsApp, gerir lista de espera. Não vê salários nem margens |
| **Contabilista** | `FINANCE` | Exportar faturação, despesas, comissões. Sem acesso a dados clínicos ou notas pessoais |

## 1.4 Ciclo de vida típico de uma cliente

```
Lead (WhatsApp/Instagram)
  → Primeira marcação
    → Consentimento RGPD + ficha de anamnese assinada
      → Atendimento nº1 (aplicação completa)
        → Follow-up 48h automático
          → Manutenção às 3 semanas (lembrete automático aos 18 dias)
            → Fidelização (carimbo no cartão, gift card, indicação)
              → Se 45 dias sem voltar → campanha de recuperação
```

O CRM tem de suportar **cada seta** deste diagrama automaticamente.

---

# 2. OBJETIVOS E NÃO-OBJETIVOS

## 2.1 Objetivos

- Substituir integralmente caderno, Excel e memória.
- Zero marcações impossíveis (sobreposição ou deslocação irrealista).
- Saber, em qualquer momento, quanto entrou, quanto saiu e quanto se deve a cada profissional.
- Nunca perder uma cliente por esquecimento de follow-up.
- Conformidade RGPD demonstrável (consentimento, retenção, exportação, apagamento).
- Preparado para crescer: mais profissionais, mais unidades, sem reescrita.

## 2.2 Não-objetivos (v1)

- **Não** é uma loja online. Não processa pagamentos com cartão online na v1 (só regista pagamentos recebidos).
- **Não** substitui software de faturação certificado pela AT. Exporta dados para o contabilista; a fatura-recibo legal é emitida no software certificado.
- **Não** faz gestão de campanhas de anúncios pagos.
- **Não** tem app móvel nativa — é uma web app responsiva (PWA na fase 8).
- **Não** integra com o site público na v1. Fica preparado (secção 27.6), mas não se implementa.

---

# 3. PESQUISA OBRIGATÓRIA ANTES DE IMPLEMENTAR

> **Esta secção é uma instrução de execução, não documentação.**

Antes de escrever a primeira linha de código de cada módulo marcado com 🔎, o agente **tem de** fazer pesquisa web e registar as conclusões em `docs/pesquisa/<modulo>.md`.

## 3.1 Sistemas de referência a estudar

| Sistema | O que copiar |
|---|---|
| **Fresha** | Fluxo de marcação, gestão de no-shows, depósitos, relatório de ocupação |
| **Booksy** | Perfil de profissional, notificações, sistema de reviews |
| **Phorest** | Retenção de clientes, "client re-book rate", campanhas automáticas |
| **Vagaro** | Gestão de stock por serviço, comissões escalonadas |
| **Cliniko** | Fichas clínicas, consentimentos, notas por sessão, RGPD/HIPAA |
| **HubSpot** | Pipeline visual, timeline de atividade, propriedades customizáveis, lifecycle stages |
| **Salesforce** | Modelo de permissões (perfis + conjuntos de permissões), audit trail, relatórios configuráveis |
| **Treatwell** | Zonas de cobertura, filtros por localização |

## 3.2 Módulos que exigem pesquisa

- 🔎 **Agenda e disponibilidade** — como Fresha e Booksy resolvem buffers e serviços encadeados.
- 🔎 **Deslocação** — pesquisar apps de serviços ao domicílio (Uber-like scheduling, "travel time buffers"). Ver como o Google Maps Distance Matrix API e o OSRM/OpenRouteService se comparam em preço e precisão para Lisboa.
- 🔎 **WhatsApp Business API** — Meta Cloud API: templates, janela de 24h, custos por conversa em Portugal, processo de aprovação de templates.
- 🔎 **Fidelidade** — o modelo está decidido (cartão de 5 carimbos). Pesquisar apenas: qual das 4 opções de recompensa (18.1) retém mais em estética, e se vale a pena recompensar indicações.
- 🔎 **Comissões** — modelos usados em salões: % fixa, escalonada por faturação, diferente para serviço vs. produto.
- 🔎 **RGPD em estética** — categoria especial de dados (saúde/alergias), prazo de retenção legal em Portugal, CNPD.
- 🔎 **Assinatura digital** — validade legal em Portugal de assinatura manuscrita em ecrã (canvas) vs. assinatura qualificada. O que basta para consentimento informado.

## 3.3 Formato do registo de pesquisa

```markdown
# Pesquisa — <Módulo>
Data: YYYY-MM-DD

## Fontes consultadas
- [Título](url) — o que trouxe

## Padrões encontrados
1. ...

## Decisão para o AYAHA CRM
Escolhemos X porque Y. Rejeitámos Z porque W.

## Impacto no schema
Campos/tabelas afetadas.
```

---

# 4. STACK TÉCNICA E DECISÕES DE ARQUITETURA

## 4.1 Stack

| Camada | Escolha | Justificação |
|---|---|---|
| Framework | **Next.js 15 (App Router) + TypeScript strict** | Server Components reduzem JS no cliente; Server Actions simplificam mutações; já é a stack do site |
| UI | **Tailwind CSS + shadcn/ui (Radix)** | Acessível por defeito, componentes copiados para o repo (sem lock-in de versão) |
| Base de dados | **PostgreSQL (Supabase)** | Relacional, transações, `tstzrange` para exclusão de sobreposições, Row Level Security disponível |
| ORM | **Prisma** | Migrações versionadas, tipos gerados, bom DX |
| Autenticação | **Auth.js v5 (NextAuth) com adapter Prisma** | Sessões em BD, credenciais + magic link, MFA na fase 8 |
| Validação | **Zod** | Um schema serve API, formulário e tipos |
| Formulários | **React Hook Form + zodResolver** | Menos re-renders, integra com Zod |
| Estado servidor | **TanStack Query** (só onde há polling/otimista) | Agenda e pipeline precisam; o resto usa RSC |
| Datas | **date-fns + date-fns-tz** | Leve, tree-shakeable, `pt` locale |
| Tabelas | **TanStack Table** | Ordenação, filtros, paginação server-side |
| Gráficos | **Recharts** | Suficiente para os KPIs; ver secção 28.6 para regras de cor |
| Ficheiros | **Supabase Storage** | Buckets privados com URLs assinadas |
| Filas/agendamento | **Supabase `pg_cron` + tabela `JobQueue`** | Evita dependência de Redis na v1 |
| E-mail | **Resend** | Domínio próprio, templates React Email |
| WhatsApp | **Meta WhatsApp Cloud API** | Oficial, templates aprovados, webhooks |
| Testes | **Vitest** (unitário) + **Playwright** (E2E) | Rápido e integrado com Vite/Next |
| Lint/Format | **ESLint + Prettier + `typescript-eslint` strict** | — |
| CI | **GitHub Actions** | lint → typecheck → test → build |

## 4.2 Decisões de arquitetura (ADR resumidos)

### ADR-01 — Camada de serviço obrigatória
Toda a lógica de negócio vive em `src/server/services/*.ts`. Rotas de API e Server Actions são invólucros finos. **Motivo:** permite testar o negócio sem HTTP e reutilizar a mesma lógica em jobs, webhooks e UI.

### ADR-02 — Dinheiro em cêntimos (`Int`)
Nunca `Float`. Um helper `src/lib/money.ts` faz `formatEUR(cents)`, `parseEUR(string)`, `applyPercent(cents, pct)` com arredondamento **half-up** documentado. **Motivo:** aritmética de vírgula flutuante em dinheiro produz erros de cêntimo que destroem a confiança no financeiro.

### ADR-03 — Multi-tenant por `unitId` desde o dia 1
Todas as tabelas de negócio têm `unitId`. Existe uma unidade única (`Benfica — Domicílio`) na v1. **Motivo:** acrescentar multi-tenant depois obriga a migrar todos os dados e reescrever todas as queries.

### ADR-04 — Soft delete universal
Nada é apagado fisicamente exceto por pedido RGPD explícito. Campo `deletedAt DateTime?`. **Motivo:** histórico financeiro e auditoria.

### ADR-05 — Eventos de domínio em tabela
Cada ação relevante escreve em `TimelineEvent` (visível ao utilizador) e/ou `AuditLog` (técnico, imutável). São tabelas diferentes com propósitos diferentes. **Motivo:** a timeline é produto; a auditoria é conformidade.

### ADR-06 — Deslocação calculada e persistida
O tempo de deslocação entre duas moradas é calculado por API externa, **guardado em cache** na tabela `TravelEstimate` com chave `(origemGeohash, destinoGeohash, faixaHorária)`. **Motivo:** a Distance Matrix API é paga; recalcular a cada render seria proibitivo.

### ADR-07 — Sem RLS do Supabase na v1
A autorização é feita na camada de serviço em Node, não no Postgres. **Motivo:** RLS com Prisma exige `SET LOCAL` por transação e complica muito. Reavaliar se algum dia houver acesso direto do browser à BD.

---

# 5. ESTRUTURA DE PASTAS

```
ayaha-crm/
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── docs/
│   ├── ESPECIFICACAO.md          ← este ficheiro
│   ├── pesquisa/                 ← output da secção 3
│   ├── adr/                      ← decisões de arquitetura
│   └── runbook.md                ← operação: backups, restauro, incidentes
├── public/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   └── recuperar/
│   │   ├── (app)/                ← tudo autenticado
│   │   │   ├── layout.tsx        ← shell: sidebar + topbar
│   │   │   ├── page.tsx          ← dashboard
│   │   │   ├── agenda/
│   │   │   ├── clientes/
│   │   │   │   └── [id]/
│   │   │   ├── atendimentos/     ← pipeline
│   │   │   ├── equipa/
│   │   │   ├── servicos/
│   │   │   ├── stock/
│   │   │   ├── financeiro/
│   │   │   ├── marketing/        ← campanhas, cupões, gift cards
│   │   │   ├── relatorios/
│   │   │   └── definicoes/
│   │   └── api/
│   │       ├── auth/[...nextauth]/
│   │       ├── webhooks/
│   │       │   ├── whatsapp/
│   │       │   └── email/
│   │       ├── cron/             ← invocado por pg_cron/Vercel Cron
│   │       └── v1/               ← API pública futura
│   ├── components/
│   │   ├── ui/                   ← shadcn
│   │   ├── agenda/
│   │   ├── clientes/
│   │   ├── charts/
│   │   └── shared/
│   ├── server/
│   │   ├── db.ts                 ← singleton PrismaClient
│   │   ├── auth.ts
│   │   ├── permissions.ts        ← RBAC (secção 7)
│   │   ├── audit.ts
│   │   ├── services/
│   │   │   ├── clients.ts
│   │   │   ├── appointments.ts
│   │   │   ├── availability.ts   ← ⭐ motor de disponibilidade
│   │   │   ├── travel.ts         ← ⭐ deslocação
│   │   │   ├── waitlist.ts
│   │   │   ├── loyalty.ts
│   │   │   ├── giftcards.ts
│   │   │   ├── coupons.ts
│   │   │   ├── inventory.ts
│   │   │   ├── finance.ts
│   │   │   ├── commissions.ts
│   │   │   ├── reports.ts
│   │   │   ├── documents.ts
│   │   │   ├── consent.ts
│   │   │   └── messaging.ts
│   │   ├── jobs/                 ← handlers de tarefas agendadas
│   │   └── integrations/
│   │       ├── whatsapp/
│   │       ├── email/
│   │       └── maps/
│   ├── lib/
│   │   ├── money.ts
│   │   ├── datetime.ts
│   │   ├── format.ts
│   │   ├── validation/           ← schemas Zod partilhados
│   │   └── constants.ts
│   └── types/
├── tests/
│   ├── unit/
│   └── e2e/
├── .env.example
├── CLAUDE.md                     ← contexto para o agente
└── package.json
```

---

# 6. MODELO DE DADOS

## 6.1 Convenções

- Tabelas em `PascalCase` singular. Campos em `camelCase`.
- Chaves primárias: `id String @id @default(cuid())`.
- Todas as tabelas de negócio: `unitId`, `createdAt`, `updatedAt`, `deletedAt?`.
- Dinheiro: `Int` em cêntimos, sufixo `Cents`.
- Duração: `Int` em minutos, sufixo `Min`.
- Percentagem: `Int` em basis points (1250 = 12,50%), sufixo `Bps`.

## 6.2 Schema Prisma

> **O schema não está aqui.** A fonte de verdade é `prisma/schema.prisma`.
>
> Esta secção continha uma cópia do schema com 1340 linhas. Foi retirada em
> 10/08/2026 porque já estava desatualizada: o schema real tinha entretanto
> crescido cerca de 16 KB (modelos e campos novos), e um documento que
> contradiz o código é pior do que um documento que não o descreve.
>
> Para ver o modelo de dados: abrir `prisma/schema.prisma`. Para o alterar:
> editar esse ficheiro e criar migração com `npx prisma migrate dev`.
> As convenções de nomes e tipos continuam válidas — estão em 6.1, acima.

## 6.3 Constraints que o Prisma não exprime

Adicionar via SQL numa migração manual:

```sql
-- 1. Impedir sobreposição de marcações da mesma profissional
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "Appointment"
ADD CONSTRAINT appointment_no_overlap
EXCLUDE USING gist (
  "professionalId" WITH =,
  tstzrange("departAt", "endAt", '[)') WITH &&
) WHERE ("deletedAt" IS NULL AND "status" NOT IN ('CANCELLED','NO_SHOW'));

-- 2. Stock nunca negativo (salvo ajuste explícito)
ALTER TABLE "Material" ADD CONSTRAINT material_qty_nonneg
CHECK ("quantityOnHand" >= 0);

-- 3. Saldo de gift card entre 0 e o valor inicial
ALTER TABLE "GiftCard" ADD CONSTRAINT giftcard_balance_valid
CHECK ("balanceCents" >= 0 AND "balanceCents" <= "initialCents");

-- 4. Numeração de fatura imutável depois de emitida (trigger)
CREATE OR REPLACE FUNCTION prevent_invoice_number_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD."status" <> 'DRAFT' AND NEW."number" <> OLD."number" THEN
    RAISE EXCEPTION 'Número de fatura não pode ser alterado após emissão';
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_invoice_number
BEFORE UPDATE ON "Invoice"
FOR EACH ROW EXECUTE FUNCTION prevent_invoice_number_change();

-- 5. AuditLog é append-only
REVOKE UPDATE, DELETE ON "AuditLog" FROM PUBLIC;
```

> **Nota crítica sobre a constraint 1:** ela usa `departAt` (hora de partida, já com deslocação) e não `startAt`. É isto que torna impossível marcar dois atendimentos geograficamente incompatíveis. `departAt` **tem de** ser sempre preenchido pelo serviço antes de gravar.

---

# 7. AUTENTICAÇÃO, PAPÉIS E PERMISSÕES

## 7.1 Autenticação

- **Login por e-mail + palavra-passe**, hash **Argon2id** (`@node-rs/argon2`).
- Sessão em base de dados, cookie `httpOnly`, `secure`, `sameSite=lax`, 8 horas de inatividade / 30 dias com "manter sessão".
- **Bloqueio progressivo:** 5 falhas → 15 min; 10 falhas → 1 h; notifica o `OWNER`.
- **Recuperação:** magic link por e-mail, token de uso único, 30 min de validade.
- **MFA (TOTP)** obrigatório para `OWNER` e `FINANCE` a partir da fase 8.
- Sem registo público. Utilizadores são criados por convite do `OWNER`/`MANAGER`.

## 7.2 Matriz de permissões

Permissões nomeadas `recurso:ação`. Papel = conjunto base; `grants`/`revokes` em `UserUnit` afinam caso a caso.

| Permissão | OWNER | MANAGER | PROFESSIONAL | RECEPTIONIST | FINANCE | READONLY |
|---|:-:|:-:|:-:|:-:|:-:|:-:|
| `client:read` | ✅ | ✅ | 🔸 próprias | ✅ | ❌ | ✅ |
| `client:create` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `client:update` | ✅ | ✅ | 🔸 próprias | ✅ | ❌ | ❌ |
| `client:delete` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `client:health:read` | ✅ | ✅ | 🔸 próprias | ❌ | ❌ | ❌ |
| `client:health:write` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `client:export` | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| `appointment:read` | ✅ | ✅ | 🔸 próprias | ✅ | ❌ | ✅ |
| `appointment:create` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `appointment:update` | ✅ | ✅ | 🔸 próprias | ✅ | ❌ | ❌ |
| `appointment:cancel` | ✅ | ✅ | 🔸 próprias | ✅ | ❌ | ❌ |
| `appointment:override_conflict` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `service:read` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `service:write` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `professional:read` | ✅ | ✅ | 🔸 próprio | ✅ | ✅ | ❌ |
| `professional:write` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `professional:pay_data` | ✅ | ❌ | 🔸 próprio | ❌ | ✅ | ❌ |
| `schedule:write` | ✅ | ✅ | 🔸 próprio | ❌ | ❌ | ❌ |
| `timeoff:approve` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `inventory:read` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `inventory:write` | ✅ | ✅ | 🔸 consumo | ✅ | ❌ | ❌ |
| `inventory:cost` | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| `finance:read` | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| `finance:write` | ✅ | ✅ | ❌ | 🔸 pagamentos | ✅ | ❌ |
| `finance:cash_close` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `commission:read` | ✅ | ✅ | 🔸 própria | ❌ | ✅ | ❌ |
| `commission:approve` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `marketing:read` | ✅ | ✅ | ❌ | ✅ | ❌ | ✅ |
| `marketing:write` | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| `message:send` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `message:bulk` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `report:read` | ✅ | ✅ | 🔸 própria | 🔸 operacional | ✅ | ✅ |
| `report:financial` | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| `audit:read` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `gdpr:handle` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `settings:write` | ✅ | 🔸 parcial | ❌ | ❌ | ❌ | ❌ |
| `user:manage` | ✅ | 🔸 exceto OWNER | ❌ | ❌ | ❌ | ❌ |

🔸 = acesso condicionado (ver 7.3)

## 7.3 Regras de escopo (`scope`)

```ts
// src/server/permissions.ts
type Scope = "ALL" | "OWN" | "NONE";

// Exemplo: PROFESSIONAL só vê clientes com quem teve atendimento
function clientScope(actor: Actor): Prisma.ClientWhereInput {
  if (can(actor, "client:read", "ALL")) return { unitId: actor.unitId };
  if (can(actor, "client:read", "OWN")) {
    return {
      unitId: actor.unitId,
      OR: [
        { ownerProfessionalId: actor.professionalId },
        { appointments: { some: { professionalId: actor.professionalId } } },
      ],
    };
  }
  throw new ForbiddenError();
}
```

**Regra obrigatória:** nenhum serviço faz `prisma.X.findMany()` sem passar pelo helper de escopo correspondente. Um teste automático (`tests/unit/permissions.spec.ts`) percorre `src/server/services/` e falha se encontrar acesso direto ao Prisma sem escopo.

## 7.4 Acesso a dados sensíveis

Ler `ClientHealthRecord` ou `Professional.iban` escreve **sempre** um `AuditLog` com `action: "VIEW_SENSITIVE"`. O `OWNER` recebe um resumo semanal de quem viu o quê.

---

# 8. MÓDULO 1 — CRM DE CLIENTES 🔎

## 8.1 Objetivo

Ficha única e completa de cada cliente, que responde em 5 segundos a: quem é, quanto vale, quando volta, o que gosta, o que não pode usar.

## 8.2 Ecrãs

### 8.2.1 Lista de clientes (`/clientes`)

- Tabela server-side: paginação, ordenação, filtros combináveis.
- **Colunas:** avatar+nome, telefone, estado (badge colorido), última visita, próxima visita, nº visitas, LTV, profissional preferida, tags.
- **Filtros:** estado, tag, profissional, fonte de aquisição, zona de deslocação, intervalo de última visita, tem/não tem marcação futura, opt-in de marketing.
- **Vistas guardadas:** "Em risco", "Aniversariantes do mês", "Sem próxima marcação", "Top 20 LTV", "Novas este mês". Guardadas em `Setting`.
- **Pesquisa global:** nome, telefone (normalizado, ignora espaços e `+351`), e-mail, código de marcação.
- **Ações em massa:** aplicar tag, exportar CSV, enviar campanha (respeitando opt-in), mudar profissional preferida.
- **Botão primário:** "Nova cliente".

### 8.2.2 Ficha da cliente (`/clientes/[id]`)

Layout em 3 colunas em desktop, empilhado em mobile.

**Coluna esquerda — Identidade**
- Foto/iniciais, nome, badge de nível de fidelidade, badges de alerta (⚠️ alergia, 🚫 bloqueada, 🔴 3 no-shows).
- Contactos com ações rápidas: botão WhatsApp (abre conversa com template), copiar telefone, e-mail.
- Morada principal + botão "Abrir no Maps" + notas de acesso em destaque.
- Zona de deslocação e taxa aplicável.
- Estado, fonte, quem indicou, profissional preferida.

**Coluna central — Separadores**

| Separador | Conteúdo |
|---|---|
| **Timeline** | Feed cronológico de tudo (secção 15) |
| **Marcações** | Passadas e futuras, com estado, valor, profissional; botão "Repetir última" |
| **Ficha de saúde** | `ClientHealthRecord`. Requer `client:health:read`. Banner vermelho se houver alergia |
| **Fotos** | Antes/depois por atendimento, com indicação de consentimento para uso público |
| **Financeiro** | Faturas, pagamentos, saldo em aberto, gift cards, cupões usados |
| **Fidelidade** | Cartão atual com carimbos preenchidos (visual), quantos faltam, cartões anteriores, recompensas ganhas e por usar |
| **Documentos** | Consentimentos assinados, anamnese, ficheiros |
| **Notas** | Notas internas com autor e data; podem ser fixadas |

**Coluna direita — Inteligência**
- **Card "Próxima ação recomendada"** — regras em 8.4.
- KPIs: LTV, ticket médio, nº visitas, intervalo médio entre visitas, taxa de no-show, dias desde a última visita.
- Serviços mais feitos (top 3 com contagem).
- Mini-gráfico de gastos nos últimos 12 meses.
- Indicações feitas e quantas converteram.

### 8.2.3 Criar/editar cliente

Formulário em passos (wizard) na criação, tudo numa página na edição:
1. **Identidade** — nome, telefone (obrigatório, validado E.164 PT), e-mail, data de nascimento.
2. **Morada** — com autocomplete de código postal PT e geocodificação automática. Mostra a zona e a taxa calculada em tempo real.
3. **Saúde** — anamnese (só se `client:health:write`).
4. **Consentimentos** — checkboxes RGPD com textos versionados + assinatura.

**Validações:**
- Telefone único por unidade. Se já existir, mostrar a ficha existente com opção "Ir para a ficha" ou "Criar mesmo assim (familiar)".
- Se `birthDate` < 18 anos: obrigar campo de encarregado de educação e assinatura do responsável.
- Geocodificação falhada não bloqueia gravação, mas marca a cliente com tag automática `morada-por-confirmar`.

## 8.3 Cálculo automático de estado

Job diário `recalcClientStatus`:

```
dias = hoje - lastVisitAt

se blocked manualmente        → BLOCKED
senão se visitCount == 0      → LEAD
senão se dias <= 60           → ACTIVE
senão se dias <= 90           → AT_RISK
senão                         → DORMANT
```

Uma transição `ACTIVE → AT_RISK` cria um `TimelineEvent` e uma `Notification` para a profissional responsável.

## 8.4 Motor de "próxima ação recomendada"

Avaliado por ordem; a primeira regra que bater vence.

| Prioridade | Condição | Ação sugerida |
|---|---|---|
| 1 | Marcação nas próximas 24h sem confirmação | "Confirmar marcação" |
| 2 | Consentimento RGPD em falta ou expirado | "Recolher consentimento" |
| 3 | Serviço exige patch test e não há teste válido | "Agendar teste de sensibilidade" |
| 4 | Fatura em aberto há > 7 dias | "Cobrar €X" |
| 5 | Última visita foi manutenção e passaram ≥ `recommendedGapDays` − 3 | "Propor manutenção" |
| 6 | Estado `AT_RISK` | "Campanha de recuperação" |
| 7 | Aniversário nos próximos 7 dias | "Enviar mensagem de aniversário" |
| 8 | Cartão completo sem recompensa escolhida | "Cartão cheio — escolher recompensa" |
| 8b | Recompensa ganha e por usar, a expirar em < 30 dias | "Avisar que a recompensa expira" |
| 8c | Faltam 1 ou 2 carimbos para completar o cartão | "Está a 1 atendimento do prémio — mencionar" |
| 9 | Atendimento concluído há 2 dias sem follow-up | "Pedir feedback" |
| 10 | Nenhuma das anteriores | "Sem ação pendente" |

## 8.5 Critérios de aceitação

- [ ] Criar cliente com telefone duplicado mostra aviso e não cria silenciosamente.
- [ ] `PROFESSIONAL` não vê clientes de outra profissional na lista nem por URL direto.
- [ ] Abrir a ficha de saúde grava `AuditLog` com `VIEW_SENSITIVE`.
- [ ] Filtro "Em risco" devolve exatamente as clientes com estado `AT_RISK`.
- [ ] Métricas (LTV, visitCount) batem certo com a soma das faturas pagas.
- [ ] Exportar CSV requer `client:export` e grava `AuditLog` com `EXPORT`.
- [ ] A ficha carrega em < 800 ms com 5 000 clientes em base.

---

# 9. MÓDULO 2 — CRM DE FUNCIONÁRIOS

## 9.1 Objetivo

Gerir a equipa como se gere clientes: perfil, competências, disponibilidade, desempenho e remuneração.

## 9.2 Ecrãs

### 9.2.1 Lista da equipa (`/equipa`)
Cards com foto, nome, cor da agenda, papel, competências (chips), ocupação da semana (%), faturação do mês vs. meta, estado (ativa/inativa/de férias).

### 9.2.2 Perfil da profissional (`/equipa/[id]`)

| Separador | Conteúdo |
|---|---|
| **Perfil** | Dados pessoais, contrato, datas, cor, bio, foto |
| **Competências** | Que serviços faz, com duração e preço próprios; nível 1–5 |
| **Horário** | Grelha semanal editável (secção 12) |
| **Ausências** | Férias, faltas, formação; pedidos pendentes de aprovação |
| **Deslocação** | Tem viatura, modo de transporte, tempo máximo aceite, morada de partida |
| **Desempenho** | Atendimentos, faturação, ticket médio, taxa de retorno das suas clientes, no-shows, avaliação média |
| **Comissões** | Regras aplicáveis, comissões do mês, histórico de pagamentos |
| **Documentos** | Contrato, certificados de formação, seguro, cópia de identificação |
| **Acesso** | Papel, permissões extra/removidas, últimos acessos, forçar terminação de sessão |

### 9.2.3 Onboarding de nova profissional (wizard)
1. Dados pessoais e criação de utilizador (envia convite por e-mail).
2. Tipo de contrato, NIF, IBAN.
3. Competências (que serviços faz).
4. Horário base.
5. Regra de comissão.
6. Documentos obrigatórios.

Enquanto não completar os passos 1–4, a profissional aparece como `isBookable: false`.

## 9.3 KPIs por profissional

| KPI | Fórmula |
|---|---|
| Taxa de ocupação | (minutos atendidos + deslocação) ÷ minutos disponíveis |
| Faturação | Σ `totalCents` de atendimentos `COMPLETED` no período |
| Ticket médio | faturação ÷ nº atendimentos |
| Taxa de retorno | clientes com ≥ 2 atendimentos com ela ÷ clientes totais dela |
| Taxa de no-show | no-shows ÷ marcações confirmadas |
| Receita por hora ocupada | faturação ÷ horas ocupadas (inclui deslocação) |
| Custo de material | Σ `StockMovement` de consumo dela |
| Margem por atendimento | (total − material − comissão − deslocação) ÷ total |

## 9.4 Critérios de aceitação

- [ ] Uma profissional sem competência num serviço não aparece nas opções ao marcar esse serviço.
- [ ] Desativar uma profissional com marcações futuras obriga a reatribuir ou cancelar; o sistema lista-as.
- [ ] `PROFESSIONAL` vê o próprio IBAN mas não o das colegas.
- [ ] Taxa de ocupação inclui o tempo de deslocação (é o que diferencia este CRM).

---

# 10. MÓDULO 3 — SERVIÇOS E CATÁLOGO

## 10.1 Funcionalidades

- CRUD de categorias e serviços com ordenação por arrastar.
- Preço, duração, setup/teardown, buffer.
- Marcação de serviço como **manutenção** de um serviço-pai, com `recommendedGapDays`.
- **Bill of materials:** que materiais e que quantidade cada serviço consome. É isto que alimenta o abate automático de stock.
- Regras: exige patch test, antecedência mínima/máxima, sinal obrigatório.
- `priceOnRequest` para serviços sem preço público.
- Duplicar serviço.
- Histórico de alterações de preço (via `AuditLog`, com ecrã dedicado).

## 10.2 Serviços iniciais (seed)

**Dados reais confirmados pela fundadora (2026-07-27). São 7 serviços, todos a €30.**

| # | Serviço | Slug | Duração | Setup | Teardown | Preço |
|---|---|---|---|---|---|---|
| 1 | Fio a Fio (Clássico) | `fio-a-fio` | 90 min | 15 | 5 | €30 |
| 2 | Volume Brasileiro | `volume-brasileiro` | 120 min | 15 | 5 | €30 |
| 3 | Volume Russo | `volume-russo` | 120 min | 15 | 5 | €30 |
| 4 | Volume Egípcio | `volume-egipcio` | 120 min | 15 | 5 | €30 |
| 5 | Fox Eyes | `fox-eyes` | 120 min | 15 | 5 | €30 |
| 6 | Efeito Gatinho | `efeito-gatinho` | 90 min | 15 | 5 | €30 |
| 7 | Efeito Esquilo | `efeito-esquilo` | 90 min | 15 | 5 | €30 |

Categoria única: **Cílios**. Não há serviços de sobrancelhas no catálogo atual.

**Notas importantes:**

- **Preço único de €30 em todos os serviços.** Isto é uma decisão de negócio
  deliberada (simplicidade de comunicação), não um erro. O CRM não deve assumir
  variação de preço por serviço em nenhum cálculo.
- **Todos os preços são editáveis no painel** sem tocar em código — é já assim
  no site atual e tem de continuar a ser no CRM.
- **Não existe serviço de "manutenção" separado no catálogo.** Uma manutenção é
  hoje uma nova marcação do mesmo serviço. O campo `recommendedGapDays` do
  serviço passa a ser o motor dos lembretes: **21 dias** para todos os serviços
  de cílios. Se a fundadora quiser mais tarde um preço de manutenção diferente,
  cria-se um serviço com `isMaintenance: true` e `parentServiceId`.
- **Remoção** não está no catálogo. Se for cobrada, acrescentar depois pelo painel.

## 10.2.1 Implicações do preço único

Com todos os serviços a €30, alguns módulos ficam mais simples e outros ganham
importância:

| Módulo | Impacto |
|---|---|
| Relatório "receita por serviço" | Passa a medir **volume**, não valor. O que interessa é quais são mais pedidos |
| Ticket médio | Praticamente fixo (€30 + deslocação). A alavanca de crescimento é **frequência**, não valor |
| Margem por serviço | **Crítica.** Volume Russo demora 120 min e rende o mesmo que Fio a Fio em 90 min. O relatório de **receita por hora ocupada** é o mais importante do sistema |
| Comissões | Simples: percentagem única sobre €30 |
| Deslocação | Ganha peso enorme: €10 de taxa sobre €30 é 33% do valor. A gestão de zonas é decisiva para a rentabilidade |

> ⚠️ **Insight a apresentar à fundadora no dashboard:** com preço único, o
> Volume Russo/Brasileiro/Egípcio/Fox Eyes (120 min) rende **€15/hora** enquanto
> o Fio a Fio/Gatinho/Esquilo (90 min) rende **€20/hora**. O relatório de
> rentabilidade por serviço tem de tornar isto óbvio.

## 10.3 Critérios de aceitação

- [ ] Alterar o preço de um serviço não altera o valor de marcações já criadas (snapshot em `AppointmentItem`).
- [ ] Desativar um serviço não o remove de marcações passadas.
- [ ] O BOM de um serviço abate stock automaticamente ao concluir o atendimento.

---

# 11. MÓDULO 4 — AGENDA INTELIGENTE 🔎

> **Este é o coração do sistema. Implementar com Opus.**

## 11.1 Vistas

| Vista | Descrição |
|---|---|
| **Dia** | Colunas = profissionais, linhas = horas. Blocos de atendimento com cor da profissional. Blocos cinzentos de deslocação entre atendimentos |
| **Semana** | Grelha 7 dias × horas, filtrável por profissional |
| **Mês** | Densidade por dia (heatmap de ocupação) + contagem |
| **Agenda (lista)** | Lista cronológica, ideal em mobile — é a vista por defeito no telemóvel |
| **Mapa do dia** | Mapa de Lisboa com os pontos do dia numerados pela ordem, e a rota. Mostra tempo total em viagem |

## 11.2 Comportamento da grelha

- Granularidade de 15 minutos.
- **Arrastar para criar**: seleciona intervalo, abre o modal de nova marcação pré-preenchido.
- **Arrastar para mover**: revalida disponibilidade em tempo real; se inviável, o bloco fica vermelho e não larga.
- **Redimensionar** altera a duração (avisa se diverge da duração do serviço).
- **Bloco de deslocação** desenhado antes e depois do atendimento, com o tempo e a distância. Não é editável diretamente.
- Linha "agora" com atualização a cada minuto.
- Zonas fora do horário de trabalho a cinzento; ausências com padrão às riscas.
- Atualização em tempo real via polling de 30 s (TanStack Query) — Realtime do Supabase fica para a fase 8.

## 11.3 Modal de nova marcação

Fluxo em 4 passos, num único modal:

1. **Cliente** — pesquisa com autocomplete, ou "Criar nova" inline (nome + telefone bastam).
2. **Serviços** — multi-seleção; mostra duração acumulada e total. Filtra serviços que a profissional não faz.
3. **Quando** — mostra apenas **slots viáveis** devolvidos pelo motor (secção 11.4). Nunca um calendário livre.
4. **Confirmar** — resumo com morada, taxa de deslocação, total, sinal exigido, e checkbox "Enviar confirmação por WhatsApp".

## 11.4 Motor de disponibilidade ⭐

Assinatura:

```ts
// src/server/services/availability.ts
type SlotQuery = {
  unitId: string;
  serviceIds: string[];
  clientId?: string;
  addressId?: string;          // define onde é o atendimento
  professionalId?: string;     // undefined = qualquer
  from: Date;
  to: Date;
  granularityMin?: number;     // default 15
};

type Slot = {
  startAt: Date;
  endAt: Date;
  departAt: Date;
  professionalId: string;
  travelToMin: number;
  travelFromMin: number;
  travelFeeCents: number;
  score: number;               // 0-100, para ordenar sugestões
  warnings: string[];
};

async function findSlots(q: SlotQuery): Promise<Slot[]>;
```

### Algoritmo

```
1. Resolver duração total:
   duracaoServico = Σ (skill.durationMin ?? service.durationMin)
   setup   = max(service.setupMin)        // não soma, é uma montagem só
   teardown= max(service.teardownMin)
   buffer  = Σ service.bufferAfterMin
   duracaoTotal = setup + duracaoServico + teardown + buffer

2. Determinar candidatas:
   profissionais ativas, bookable, com skill para TODOS os serviceIds
   (se professionalId dado, só essa)

3. Para cada profissional P e cada dia D no intervalo:
   a. Obter janelas de trabalho de P em D (WorkingHour válidos em D)
   b. Subtrair TimeOff de P e da unidade em D
   c. Obter marcações existentes de P em D, ordenadas por startAt
      → cada uma ocupa [departAt, endAt + travelFromMin]
   d. Calcular os intervalos livres resultantes

4. Para cada intervalo livre [L1, L2]:
   a. Determinar a origem: se há marcação anterior nesse dia, a morada dela;
      senão, a morada de partida de P (homeLat/Lng ou base da unidade)
   b. travelTo = estimarViagem(origem, destino, modo, faixaHoraria)
   c. Determinar o destino seguinte: morada da marcação seguinte,
      ou a morada de partida de P se for a última do dia
   d. Para cada candidato de início S em [L1, L2], de granularityMin em granularityMin:
        departAt = S - travelTo
        endAt    = S + duracaoTotal
        travelFrom = estimarViagem(destino, proximoDestino, ...)
        SE departAt >= L1
        E  endAt + travelFrom <= L2
        E  travelTo <= P.maxTravelMin
        E  travelFrom <= P.maxTravelMin
        ENTÃO é um slot válido

5. Aplicar regras de negócio:
   - S >= agora + service.minAdvanceHours
   - S <= agora + service.maxAdvanceDays
   - se serviço exige patch test: cliente tem teste válido? senão warning
   - se zona tem minSpendCents e o total é inferior: warning

6. Pontuar (score):
   +40  encaixa entre duas marcações existentes (reduz tempo morto)
   +25  é a profissional preferida da cliente
   +15  proximidade geográfica à marcação anterior (< 10 min)
   +10  está na faixa horária habitual da cliente
   -20  cria um buraco > 90 min na agenda
   -15  é o único atendimento do dia dessa profissional
   -10  fora da faixa horária habitual da cliente

7. Devolver ordenado por score desc, depois por startAt asc, limitado a 50
```

### Cache e performance

- `estimarViagem` consulta `TravelEstimate` primeiro (chave: geohash7 origem+destino+modo+faixa). TTL 30 dias.
- Miss → chama a API de mapas, grava, devolve.
- **Fallback sem API:** estimativa por distância haversine × fator de 1,4 (sinuosidade urbana) ÷ velocidade média por modo (DRIVING 22 km/h em Lisboa, TRANSIT 15 km/h, WALKING 4,8 km/h), com mínimo de 10 min. Marca `provider: "HAVERSINE"` para se saber que é aproximado.
- Batch: uma pesquisa de 14 dias × 4 profissionais deve fazer **no máximo 1 chamada à API por par único de moradas**.
- Alvo de desempenho: `findSlots` para 14 dias e 4 profissionais em **< 400 ms** com cache quente.

## 11.5 Deteção de conflitos ao gravar

Antes de qualquer `create`/`update` de `Appointment`, dentro da **mesma transação**:

1. Recalcular `departAt`, `travelToMin`, `travelFromMin`.
2. Verificar a exclusion constraint (o Postgres rejeita sobreposição).
3. Verificar que a marcação **seguinte** continua alcançável — se não, erro `TRAVEL_CONFLICT_NEXT` listando qual marcação fica inviável.
4. Verificar horário de trabalho e ausências.
5. Só `OWNER`/`MANAGER` com `appointment:override_conflict` podem forçar, e isso grava `AuditLog` com o motivo obrigatório.

Erros devolvidos ao cliente com códigos legíveis:

```ts
type BookingError =
  | { code: "OVERLAP"; conflictingAppointmentId: string }
  | { code: "TRAVEL_CONFLICT_PREV"; fromAppointmentId: string; neededMin: number; availableMin: number }
  | { code: "TRAVEL_CONFLICT_NEXT"; toAppointmentId: string; neededMin: number; availableMin: number }
  | { code: "OUTSIDE_WORKING_HOURS" }
  | { code: "TIME_OFF"; timeOffId: string }
  | { code: "NO_SKILL"; serviceId: string }
  | { code: "TOO_SOON"; minAdvanceHours: number }
  | { code: "TOO_FAR"; maxAdvanceDays: number }
  | { code: "PATCH_TEST_REQUIRED" }
  | { code: "MAX_TRAVEL_EXCEEDED"; travelMin: number; maxMin: number }
  | { code: "ZONE_MIN_SPEND"; requiredCents: number; actualCents: number }
  | { code: "CLIENT_BLOCKED"; reason: string };
```

## 11.6 Critérios de aceitação

- [ ] Não é possível criar duas marcações sobrepostas para a mesma profissional, nem via API direta.
- [ ] Marcar às 10:00 em Benfica e às 11:45 em Cascais é **recusado** com `TRAVEL_CONFLICT_NEXT`.
- [ ] Arrastar um bloco para um horário inviável não grava e mostra o motivo.
- [ ] Os slots devolvidos, se aceites, gravam sempre sem erro (o motor e a validação usam o mesmo código).
- [ ] O mapa do dia mostra a ordem correta e o tempo total em viagem.
- [ ] Com a API de mapas em baixo, o sistema continua a funcionar com o fallback e avisa que a estimativa é aproximada.

---

# 12. MÓDULO 5 — GESTÃO DE HORÁRIOS E DISPONIBILIDADE

## 12.1 Horário base

- Grelha semanal por profissional, com múltiplos blocos por dia (ex.: 09:00–13:00 e 15:00–20:00).
- `validFrom`/`validUntil` permitem programar mudanças de horário futuras sem afetar o passado.
- Copiar horário de outra profissional.
- Modelos: "Full-time", "Part-time tardes", "Fins de semana".

## 12.2 Ausências

- Tipos: férias, doença, pessoal, formação, bloqueio, feriado.
- Pedido pela profissional → aprovação por `OWNER`/`MANAGER`.
- Ao aprovar uma ausência que colide com marcações existentes, o sistema **lista as marcações afetadas** e obriga a escolher: reatribuir a outra profissional / propor reagendamento / cancelar com notificação.
- Feriados portugueses (nacionais + Lisboa 13 de junho) importados automaticamente por ano, como `TimeOff` de unidade. Cada um pode ser desmarcado.

## 12.3 Capacidade e ocupação

Ecrã `/equipa/capacidade`:
- Heatmap semana × profissional com % de ocupação.
- Horas disponíveis vs. ocupadas vs. em deslocação vs. livres.
- Alerta quando a ocupação passa 85% (sinal de que se precisa de mais uma profissional) ou fica abaixo de 40% (excesso de capacidade).

## 12.4 Critérios de aceitação

- [ ] Alterar o horário base não afeta marcações já existentes fora do novo horário — apenas as sinaliza.
- [ ] Aprovar férias com marcações dentro obriga a resolver cada uma.
- [ ] Feriados nacionais de 2026 e 2027 são importados corretamente.

---

# 13. MÓDULO 6 — GESTÃO DE DESLOCAÇÃO 🔎

> **Módulo diferenciador. Nenhum CRM de estética genérico faz isto bem.**

## 13.1 Zonas

Configuração em `/definicoes/zonas`:

| Zona | Prefixos postais | Taxa | Grátis acima de | Mín. gasto | Tempo típico |
|---|---|---|---|---|---|
| Lisboa Centro | 1000–1249 | €5 | €60 | €0 | 20 min |
| Lisboa Norte/Ocidental | 1400–1749 | €5 | €60 | €0 | 15 min |
| Lisboa Oriental | 1800–1999 | €7 | €80 | €40 | 25 min |
| Grande Lisboa | 2600–2799, 2780–2799 | €10 | €100 | €60 | 35 min |
| Margem Sul | 2800–2999 | €15 | €150 | €80 | 45 min |
| Fora de área | — | — | — | — | recusar |

- Editor com mapa: desenhar polígono OU listar prefixos postais. A v1 usa prefixos; polígonos ficam para a fase 8.
- A zona é resolvida na geocodificação da morada e guardada em `Client.travelZoneId`.
- Uma morada fora de todas as zonas gera aviso ao marcar e requer aprovação de `MANAGER`.

## 13.2 Cálculo da taxa

```
taxa = zona.feeCents
se zona.freeAboveCents != null e subtotal >= zona.freeAboveCents → taxa = 0
se cliente tem nível de fidelidade com perk "TRAVEL_FREE" → taxa = 0
se é a 1ª visita e existe campanha ativa "primeira deslocação grátis" → taxa = 0
```

A taxa aparece como linha própria na fatura (`Invoice.travelFeeCents`) e **não entra na base de comissão** por defeito (`CommissionRule.deductTravel`).

## 13.3 Rota do dia

Ecrã `/agenda/rota?date=&professionalId=`:
- Mapa com marcadores numerados pela ordem cronológica.
- Painel lateral: hora de partida de casa, cada paragem com morada, notas de acesso, notas de estacionamento, cliente, serviço, duração.
- Totais: km, tempo em viagem, tempo faturável, rácio faturável/total.
- **Sugestão de otimização:** se reordenar as marcações do dia poupasse > 20 min, mostrar a proposta. **Nunca reordenar automaticamente** — as clientes têm horas combinadas. A proposta gera pedidos de reagendamento (módulo 9).
- Botão "Abrir rota no Google Maps" (gera URL com waypoints).
- Botão "Partilhar rota" — envia à profissional por WhatsApp um resumo do dia.

## 13.4 Modo "a caminho"

Quando a profissional muda o estado para `EN_ROUTE`:
- Envia automaticamente à cliente: *"Olá {{nome}}, a {{profissional}} está a caminho e chega por volta das {{hora}}."*
- A hora prevista é calculada com o trânsito atual, se a API o suportar.
- Regista `TimelineEvent`.

## 13.5 Critérios de aceitação

- [ ] Uma morada em Cascais é classificada em "Grande Lisboa" e cobra €10.
- [ ] Subtotal de €120 em "Grande Lisboa" isenta a taxa.
- [ ] O tempo de deslocação aparece na agenda como bloco visual.
- [ ] A rota do dia soma corretamente km e tempo.
- [ ] Duas moradas idênticas seguidas (mesma cliente, dois serviços) geram 0 min de deslocação entre elas.
- [ ] O cache de `TravelEstimate` evita chamadas repetidas para o mesmo par.

---

# 14. MÓDULO 7 — PIPELINE DE ATENDIMENTOS

## 14.1 Vista Kanban (`/atendimentos`)

Colunas = estados. Arrastar muda o estado, com as validações da máquina de estados.

```
┌──────────┬───────────┬──────────┬────────────┬───────────┬──────────┐
│ Pedidos  │ Confirmad.│ A caminho│ A decorrer │ Concluído │ Problema │
│ REQUESTED│ CONFIRMED │ EN_ROUTE │IN_PROGRESS │ COMPLETED │ NO_SHOW/ │
│          │ REMINDED  │          │            │           │ CANCELLED│
└──────────┴───────────┴──────────┴────────────┴───────────┴──────────┘
```

Cada card: hora, cliente, serviço, profissional (cor), zona, valor, ícones de alerta (sinal por pagar, consentimento em falta, alergia).

## 14.2 Máquina de estados

```
REQUESTED ──confirmar──→ CONFIRMED ──job 24h──→ REMINDED
                              │                     │
                              └──────┬──────────────┘
                                     ↓
                                 EN_ROUTE ──chegou──→ IN_PROGRESS ──→ COMPLETED
                                     │                     │
                                     └───────┬─────────────┘
                                             ↓
                                    NO_SHOW / CANCELLED

Qualquer estado antes de COMPLETED → CANCELLED (com motivo)
COMPLETED → (irreversível sem permissão de OWNER)
```

**Transições com efeitos:**

| Transição | Efeitos |
|---|---|
| `→ CONFIRMED` | Envia confirmação; agenda job de lembrete a 24 h; agenda job "a caminho" |
| `→ REMINDED` | Marca `remindedAt`; regista mensagem |
| `→ EN_ROUTE` | Notifica a cliente com ETA |
| `→ IN_PROGRESS` | Grava `startedAt`; bloqueia edição de serviços sem confirmação |
| `→ COMPLETED` | **Transação:** cria/emite `Invoice`, abate stock pelo BOM, **carimba o cartão de fidelidade**, calcula `Commission`, atualiza métricas da cliente, agenda follow-up a 48 h, agenda lembrete de manutenção a 18 dias |
| `→ NO_SHOW` | Incrementa `noShowCount`; aplica política de no-show (13.3); liberta o slot e notifica a lista de espera |
| `→ CANCELLED` | Exige motivo; aplica política de cancelamento; liberta o slot e notifica a lista de espera; devolve sinal se aplicável |

## 14.3 Política de no-show e cancelamento

Configurável em `Setting`, com defaults:

| Situação | Regra |
|---|---|
| Cancelamento > 24 h antes | Sem penalização; sinal devolvido |
| Cancelamento 6–24 h antes | Sinal retido (50%) |
| Cancelamento < 6 h antes | Sinal retido (100%) |
| No-show | Sinal retido; contador +1 |
| 2 no-shows | Próxima marcação exige sinal obrigatório |
| 3 no-shows | Cliente passa a `BLOCKED`; só `MANAGER` desbloqueia |

## 14.4 Ecrã de execução (mobile-first)

O que a profissional vê no telemóvel durante o atendimento:
- Cliente, morada, notas de acesso (grandes e legíveis).
- ⚠️ Alergias em banner vermelho no topo.
- Serviços a executar com checkbox.
- Botão grande "Cheguei" / "Comecei" / "Terminei".
- Fotos antes/depois (câmara direta).
- Registo de material consumido (pré-preenchido pelo BOM, ajustável).
- Notas da sessão.
- Recebimento: método de pagamento e valor.
- Botão "Marcar próxima" que sugere a data de manutenção.

## 14.5 Critérios de aceitação

- [ ] Concluir um atendimento é atómico: ou tudo (fatura + stock + carimbo + comissão) ou nada.
- [ ] Não é possível saltar de `REQUESTED` para `COMPLETED`.
- [ ] Cancelar liberta o slot e a lista de espera é notificada em < 1 min.
- [ ] O ecrã de execução funciona num ecrã de 375 px sem scroll horizontal.

---

# 15. MÓDULO 8 — TIMELINE E HISTÓRICO

## 15.1 Tipos de evento

| Tipo | Ícone | Exemplo de título |
|---|---|---|
| `CLIENT_CREATED` | 👤 | Cliente criada por Ayaha |
| `APPOINTMENT_BOOKED` | 📅 | Marcação para 5 ago, 14:00 — Volume Russo |
| `APPOINTMENT_RESCHEDULED` | 🔄 | Reagendada de 3 ago para 5 ago |
| `APPOINTMENT_CANCELLED` | ❌ | Cancelada pela cliente — motivo: doença |
| `APPOINTMENT_COMPLETED` | ✅ | Atendimento concluído — €60 |
| `NO_SHOW` | 🚫 | Não compareceu |
| `MESSAGE_SENT` | 💬 | WhatsApp: lembrete 24h |
| `MESSAGE_RECEIVED` | 📥 | WhatsApp da cliente |
| `NOTE_ADDED` | 📝 | Nota: prefere fios mais curtos no canto interno |
| `PAYMENT_RECEIVED` | 💶 | €60 em MB WAY |
| `LOYALTY_STAMPED` | ⭐ | Carimbo 3 de 5 |
| `LOYALTY_CARD_COMPLETE` | 🏆 | Cartão completo — pode escolher recompensa |
| `LOYALTY_REWARD_CHOSEN` | 🎁 | Escolheu "Desconto de €15" — código AYA-J8AU |
| `LOYALTY_REWARD_USED` | ✨ | Usou a recompensa AYA-J8AU |
| `GIFTCARD_ISSUED` / `_USED` | 🎟️ | — |
| `CONSENT_GRANTED` / `_REVOKED` | 🔒 | — |
| `DOCUMENT_SIGNED` | ✍️ | Consentimento informado assinado |
| `STATUS_CHANGED` | 🔀 | Ativa → Em risco |
| `TAG_ADDED` | 🏷️ | — |
| `PHOTO_ADDED` | 📷 | — |
| `RATING_RECEIVED` | ⭐ | 5 estrelas: "adorei!" |

## 15.2 Comportamento

- Ordem cronológica inversa, com scroll infinito (20 de cada vez).
- Filtro por tipo (chips).
- Eventos fixados aparecem sempre no topo, destacados.
- Cada evento liga à entidade correspondente.
- Escrita de nota diretamente na timeline (campo no topo).
- **Nunca editável nem apagável** — corrigir faz-se com uma nova nota.

## 15.3 Implementação

Um helper único:

```ts
// src/server/services/timeline.ts
export async function recordEvent(tx: PrismaTx, e: {
  unitId: string; clientId?: string;
  entityType: string; entityId: string;
  type: TimelineEventType; title: string; body?: string;
  actorId?: string; metadata?: Record<string, unknown>;
}): Promise<void>
```

Chamado **sempre dentro da transação** da operação que o origina, para que timeline e dados nunca divirjam.

---

# 16. MÓDULO 9 — LISTA DE ESPERA E REAGENDAMENTO INTELIGENTE

## 16.1 Lista de espera

**Entrada:** quando não há slot disponível na janela pretendida, o modal de marcação oferece "Entrar na lista de espera" e recolhe: serviços, profissional (opcional), intervalo de datas, dias da semana e faixa horária aceitáveis.

**Motor de correspondência** (`waitlist.ts`) corre quando:
- uma marcação é cancelada ou marcada como no-show;
- uma ausência é revogada;
- se acrescenta horário de trabalho;
- de hora a hora (varrimento de segurança).

```
Para cada slot libertado:
  candidatas = WaitlistEntry WAITING onde:
    - serviço compatível com a duração do slot
    - profissional compatível (ou any)
    - data dentro de [earliestDate, latestDate]
    - weekday aceite
    - hora dentro da faixa preferida
    - a deslocação até à morada dela é viável a partir da anterior
  ordenar por: priority desc, LTV desc, createdAt asc
  oferecer à primeira → status OFFERED, offerExpiresAt = agora + 2h
  enviar WhatsApp com link de aceitação de 1 clique
  se expirar → passar à seguinte (máx. 3 ofertas por entrada)
```

## 16.2 Reagendamento inteligente

Quando é preciso mover uma marcação (ausência da profissional, otimização de rota, pedido da cliente):

1. O sistema propõe **3 alternativas** com o maior score (secção 11.4.6), preferindo:
   - o mesmo dia da semana e faixa horária habitual da cliente;
   - a mesma profissional;
   - proximidade geográfica a outras marcações do dia.
2. Envia à cliente por WhatsApp com botões de escolha.
3. A resposta é processada pelo webhook e a marcação é movida automaticamente, dentro de transação, com revalidação completa.
4. `rescheduledFromId` liga a nova marcação à antiga; a timeline mostra a cadeia.

## 16.3 Preenchimento de buracos

Job diário `fillGaps`:
- Procura buracos > 90 min na agenda dos próximos 7 dias.
- Cruza com clientes `AT_RISK` e com clientes cuja manutenção está a vencer.
- Sugere ao `MANAGER` uma lista: "Estas 6 clientes podiam encaixar aqui" com botão de envio de proposta.
- **Nunca envia sozinho** — evita spam.

## 16.4 Critérios de aceitação

- [ ] Cancelar às 14:00 faz chegar uma oferta à primeira da lista em menos de 60 segundos.
- [ ] Uma oferta expirada passa automaticamente à candidata seguinte.
- [ ] Aceitar uma oferta cria a marcação com todas as validações (não há atalho).
- [ ] Duas clientes não podem aceitar o mesmo slot (lock otimista na entrada).

---

# 17. MÓDULO 10 — COMUNICAÇÕES 🔎

## 17.1 WhatsApp Business API (Meta Cloud API)

### Arquitetura
```
CRM ──POST──→ Meta Graph API ──→ Cliente
CRM ←─webhook─ Meta ←──resposta── Cliente
```

- Credenciais em env: `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_TOKEN`, `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_APP_SECRET`.
- Webhook em `/api/webhooks/whatsapp` com **verificação obrigatória da assinatura** `X-Hub-Signature-256`.
- **Janela de 24 h:** fora dela só se enviam templates aprovados. Dentro dela, texto livre. O serviço `messaging.ts` decide sozinho qual usar, consultando a última mensagem recebida.
- Todas as mensagens gravadas em `Message`, com custo estimado.

### Templates a submeter para aprovação

| Chave | Quando | Variáveis |
|---|---|---|
| `appointment_confirmed` | Ao confirmar | nome, serviço, data, hora, morada, valor |
| `reminder_24h` | 24 h antes | nome, serviço, hora, profissional |
| `reminder_2h` | 2 h antes | nome, hora |
| `on_the_way` | Estado `EN_ROUTE` | nome, profissional, ETA |
| `followup_48h` | 48 h depois | nome, profissional |
| `maintenance_due` | `gap − 3` dias | nome, serviço, dias desde a última |
| `waitlist_offer` | Slot libertado | nome, data, hora, link |
| `reschedule_options` | Reagendamento | nome, 3 opções |
| `birthday` | Aniversário | nome, oferta |
| `winback` | 60 dias sem voltar | nome, oferta |
| `review_request` | Após 3.º atendimento | nome, link |
| `giftcard_delivered` | Gift card comprado | destinatário, valor, código |

### Regras
- **Nunca** enviar marketing sem `Consent(MARKETING_WHATSAPP, granted=true)`.
- Palavras-chave de opt-out: `PARAR`, `STOP`, `SAIR` → revoga o consentimento automaticamente e confirma.
- Rate limit próprio: máx. 1 mensagem automática por cliente por dia (exceto transacionais).
- Falha de envio → retry com backoff exponencial (5 tentativas), depois `Notification` para o `MANAGER`.

## 17.2 E-mail

- Fornecedor **Resend**, domínio próprio com SPF, DKIM e DMARC configurados.
- Templates em **React Email**, com o design system da marca.
- Usos: fatura em PDF, gift card, exportação RGPD, resumo semanal para o `OWNER`, convite de utilizador.
- Link de cancelamento de subscrição obrigatório em todos os e-mails de marketing.

## 17.3 Caixa de entrada unificada (`/mensagens`)

- Lista de conversas por cliente, com o canal indicado.
- Resposta direta a partir do CRM.
- Indicação visível de quanto falta da janela de 24 h.
- Respostas rápidas configuráveis.
- Atribuição de conversa a um utilizador.
- Ligação directa à ficha da cliente.

> Fase 6. Antes disso as mensagens são só de saída, registadas em `Message`.

## 17.4 Critérios de aceitação

- [ ] Webhook rejeita pedidos com assinatura inválida.
- [ ] Enviar marketing a quem não deu consentimento é impossível (bloqueado no serviço, com teste).
- [ ] "PARAR" revoga o consentimento e cria `TimelineEvent`.
- [ ] Lembrete de 24 h dispara mesmo se o servidor estiver em baixo à hora exata (a fila recupera).
- [ ] Nenhuma mensagem é enviada duas vezes (idempotência por `JobQueue.id`).

---

# 18. MÓDULO 11 — FIDELIDADE, GIFT CARDS E CUPÕES

## 18.1 AYAHA Club — cartão de carimbos

**Regra real do negócio (confirmada pela fundadora, 2026-07-27):**

> A cada atendimento concluído, a cliente ganha **1 carimbo** num cartão de **5**.
> Ao completar os 5, escolhe **1 de 3 recompensas**. Depois o cartão recomeça do zero.

**As 3 recompensas:**

| # | Recompensa | `kind` | Valor |
|---|---|---|---|
| 1 | Desconto de €15 no próximo atendimento | `DISCOUNT_FIXED` | 1500 cêntimos |
| 2 | Upgrade de técnica gratuito | `SERVICE_UPGRADE` | 0 |
| 3 | Gift Card de €15 para oferecer a uma amiga | `GIFT_CARD` | 1500 cêntimos |

> ⚠️ **Não é um sistema de pontos.** Não há níveis, não há acumulação por euro,
> não há conversão ponto→euro. Qualquer implementação que introduza pontos está
> errada. O modelo é o cartão de carimbos clássico, que é o que a cliente já
> conhece do site.

### Mecânica detalhada

**Ganhar carimbo**
- Atribuído na transição `→ COMPLETED` do atendimento, dentro da mesma transação.
- **Um atendimento = no máximo um carimbo** (`LoyaltyStamp.appointmentId` é `@unique`).
- Se a cliente ainda não tem cartão ativo, cria-se o cartão 1 automaticamente.
- Carimbos manuais (`reason: MANUAL` ou `COMPENSATION`) exigem `MANAGER` e nota obrigatória.

**Completar cartão**
```
ao carimbar:
  card.stampsCount += 1
  se card.stampsCount >= card.stampsRequired:
     card.completedAt = agora
     card.isActive = false
     criar Notification para a equipa: "A Marta completou o cartão"
     enviar WhatsApp à cliente: template loyalty_card_complete
     se program.autoRestart: criar cartão cycleNumber + 1
```

O cartão fica completo mas **a recompensa ainda não está escolhida**. A escolha
é um ato deliberado da cliente (ou da equipa em nome dela).

**Escolher recompensa**
- Ecrã na ficha da cliente e na área de cliente do site.
- Cria `RewardRedemption` com código curto `AYA-XXXX` (alfabeto sem ambiguidade).
- Validade: `program.rewardValidDays` (default 180 dias).
- Se a escolha for `GIFT_CARD`, gera-se um `GiftCard` de €15 ligado à redenção,
  com o nome da amiga a preencher.

**Usar recompensa**
- No fecho do atendimento, a equipa introduz o código.
- `DISCOUNT_FIXED` → entra como desconto de €15 na fatura.
- `SERVICE_UPGRADE` → não altera o valor (todos os serviços custam €30);
  regista-se como cortesia na nota do atendimento. **Ver aviso abaixo.**
- `GIFT_CARD` → o gift card já foi emitido; nada acontece no atendimento.
- `status → USED`, `usedAppointmentId` preenchido.

**Estorno**
- Cancelar um atendimento já concluído revoga o carimbo (`revokedAt`), decrementa
  o contador e, se o cartão tinha ficado completo, reverte `completedAt`.
- Se a recompensa já tinha sido escolhida e usada, **não se reverte** — cria-se
  uma `Notification` para o `OWNER` decidir.

### ⚠️ Problema a resolver com a fundadora

A recompensa nº2 — **"upgrade de técnica gratuito"** — não tem significado
económico neste catálogo: **todos os 7 serviços custam €30**. Não há upgrade
possível porque não há tiers de preço.

Na prática, a cliente que escolhe esta opção recebe **nada** em valor. Isto vai
gerar frustração e é um risco real de perda de confiança no programa.

**Opções (decisão da fundadora, ver Anexo A):**

| Opção | Descrição |
|---|---|
| **A** (recomendada) | Substituir por **"Atendimento grátis"** — o 6.º atendimento é oferecido. É o clássico "compra 5, leva 6", vale €30, e é imediatamente compreensível |
| **B** | Manter, mas definir o que é: ex. aplicação de volume (120 min) ao preço/tempo de clássico, com serviços mais caros no futuro |
| **C** | Substituir por **"Deslocação grátis vitalícia"** — com €10 de taxa em Grande Lisboa, vale bastante ao longo do tempo e custa pouco em Lisboa centro |
| **D** | Substituir por **"€15 de desconto para uma amiga"** — desconto de aquisição, alinhado com indicações |

O CRM implementa as 3 recompensas configuráveis pelo painel, portanto qualquer
uma destas opções é uma alteração de dados, não de código.

### Indicações (referrals)

O schema já suporta (`Client.referredById`). Não há hoje regra de recompensa por
indicação. **Sugestão a validar:** quem indica ganha 1 carimbo extra quando a
indicada conclui o primeiro atendimento. É barato, acelera o cartão e usa a
mecânica que a cliente já entende.

## 18.2 Gift cards

- Geração de código legível: `AYA-GIFT-XXXX` (alfabeto sem caracteres ambíguos: sem `0`, `O`, `1`, `I`).
- Valores predefinidos (€25/€50/€75/€100) ou personalizado.
- Design visual PDF/PNG com mensagem para o destinatário, enviado por e-mail e/ou WhatsApp.
- **Uso parcial:** cada utilização gera `GiftCardTransaction` negativa e o saldo desce.
- Validade default 12 meses (configurável). Ecrã de gift cards a expirar nos próximos 30 dias.
- Ao usar num atendimento, entra como `Payment` com método `GIFT_CARD`.
- **Contabilisticamente**, a venda de um gift card é um passivo até ser usado. O relatório financeiro separa "gift cards vendidos" de "receita reconhecida".

## 18.3 Cupões

- Tipos: percentagem, valor fixo, serviço grátis.
- Restrições: valor mínimo, desconto máximo, validade, limite total, limite por cliente, só primeira visita, só certos serviços.
- Validação centralizada:

```ts
// src/server/services/coupons.ts
type ValidationResult =
  | { valid: true; discountCents: number; couponId: string }
  | { valid: false; reason: "NOT_FOUND" | "EXPIRED" | "NOT_STARTED"
      | "USAGE_LIMIT" | "CLIENT_LIMIT" | "MIN_SUBTOTAL" | "SERVICE_NOT_ELIGIBLE"
      | "FIRST_VISIT_ONLY" | "INACTIVE"; message: string };

export function validateCoupon(input: {
  code: string; unitId: string; clientId: string;
  subtotalCents: number; serviceIds: string[];
}): Promise<ValidationResult>;
```

**Ordem de aplicação de descontos** (fixa e testada):
```
1. subtotal de serviços
2. − recompensa de fidelidade (DISCOUNT_FIXED de €15, se houver código válido)
3. − cupão (% ou fixo, com maxDiscount)
4. + taxa de deslocação (se aplicável, calculada sobre o subtotal do passo 1)
5. = total
6. − gift card (é pagamento, não desconto)
```

**Regras de acumulação:**
- Nunca acumular mais de um cupão.
- Nunca acumular mais de uma recompensa de fidelidade.
- Recompensa + cupão **não** acumulam por defeito (com serviço a €30, €15 de
  recompensa + um cupão de 20% levaria o total a €9 — insustentável). Configurável
  em `Setting` chave `loyalty.stackWithCoupon`, default `false`.
- O total nunca pode ficar abaixo de zero. A taxa de deslocação é sempre devida
  mesmo com desconto total no serviço (é custo real).

## 18.4 Critérios de aceitação

- [ ] Um gift card de €50 usado em €30 fica com €20 de saldo e continua `ACTIVE`.
- [ ] Um cupão com `perClientLimit: 1` não pode ser usado duas vezes pela mesma cliente, nem em pedidos simultâneos (lock).
- [ ] A ordem de aplicação de descontos é coberta por testes com pelo menos 8 combinações.
- [ ] Concluir o 5.º atendimento fecha o cartão e cria o cartão nº2 automaticamente.
- [ ] Um atendimento não pode gerar dois carimbos (constraint `@unique` em `appointmentId`).
- [ ] Estornar um atendimento revoga o carimbo e reverte o cartão se este tinha ficado completo.
- [ ] Escolher a recompensa gera um código `AYA-XXXX` único e válido por 180 dias.
- [ ] Escolher `GIFT_CARD` emite um `GiftCard` de €15 ligado à redenção.
- [ ] Uma recompensa `USED` não pode ser usada outra vez.
- [ ] Uma cliente com 12 atendimentos tem 2 cartões completos e 1 em curso com 2 carimbos.

---

# 19. MÓDULO 12 — STOCK DE MATERIAIS

## 19.1 Funcionalidades

- Catálogo de materiais com categoria, fornecedor, unidade, custo.
- **Abate automático:** ao concluir um atendimento, o BOM do serviço gera `StockMovement` de consumo.
- **Ajuste manual** com motivo obrigatório (contagem física, quebra, perda).
- **Lotes e validade** para colas e produtos com prazo. Alerta 30 dias antes.
- **Alerta de stock mínimo** → `Notification` + destaque no dashboard.
- **Encomendas:** gerar encomenda automática com os materiais abaixo do mínimo, agrupada por fornecedor; enviar por e-mail; receber e dar entrada.
- **Custo médio ponderado** recalculado a cada entrada.

## 19.2 Ecrãs

- `/stock` — lista com semáforo (🔴 abaixo do mínimo, 🟡 perto, 🟢 ok), pesquisa, filtro por categoria e fornecedor.
- `/stock/[id]` — histórico de movimentos, gráfico de consumo mensal, previsão de rutura ("acaba em ~12 dias ao ritmo atual").
- `/stock/contagem` — modo de inventário físico: lista para conferir, introduzir contagem real, gera ajustes em bloco.
- `/stock/encomendas` — encomendas em curso e recebidas.

## 19.3 Relatórios

- Consumo por profissional (identifica desperdício).
- Custo de material por serviço (real vs. BOM previsto).
- Materiais mais caros em consumo mensal.
- Margem real por serviço = preço − custo de material real.

## 19.4 Critérios de aceitação

- [ ] Concluir "Volume Russo" abate exatamente as quantidades do BOM.
- [ ] Cancelar um atendimento já concluído estorna os movimentos de stock.
- [ ] Stock não pode ficar negativo por consumo automático — se ficaria, conclui na mesma mas cria `Notification` crítica.
- [ ] A previsão de rutura usa a média dos últimos 30 dias.

---

# 20. MÓDULO 13 — FINANCEIRO E FLUXO DE CAIXA

## 20.1 Faturação

- Fatura gerada automaticamente ao concluir o atendimento (estado `ISSUED`).
- Numeração sequencial por ano e unidade: `2026/0001`. **Nunca reutilizada, nunca alterada** (trigger em 6.3).
- Linhas: serviços, taxa de deslocação, descontos, IVA.
- PDF gerado e guardado no Storage; enviado por e-mail se a cliente tiver e-mail.
- Campo `externalRef` para o número no software certificado da AT.

> ⚠️ **Aviso legal:** em Portugal, a fatura fiscal tem de ser emitida em software certificado pela AT. Este CRM produz um **documento interno de controlo** e exporta os dados para o programa de faturação. Deixar isto explícito na UI (rodapé "documento não fiscal") e confirmar com o contabilista antes de usar em produção.

## 20.2 Pagamentos

- Métodos: dinheiro, cartão, MB WAY, transferência, gift card.
- Pagamento parcial e múltiplos métodos na mesma fatura.
- Sinais/depósitos registados no momento da marcação e abatidos no total.
- Reembolsos como `Payment` com `isRefund: true`.

## 20.3 Caixa (fluxo diário)

- **Abertura:** valor inicial em dinheiro por profissional/dia.
- Durante o dia: entradas (pagamentos) e movimentos manuais (sangria, reforço).
- **Fecho:** o sistema mostra o esperado em dinheiro, a profissional introduz o contado, o sistema calcula a diferença e exige justificação se ≠ 0.
- Histórico de fechos com diferenças, para identificar padrões.

## 20.4 Despesas

- Categorias: material, transporte/combustível, marketing, formação, software, seguros, outros.
- Despesas recorrentes com RRULE, geradas automaticamente.
- Upload de recibo (foto ou PDF).
- Associação opcional a profissional (ex.: combustível dela).

## 20.5 Fluxo de caixa

Ecrã `/financeiro/fluxo`:
- Gráfico de barras: entradas vs. saídas por dia/semana/mês.
- Linha acumulada de saldo.
- **Previsão a 30 dias:** marcações confirmadas futuras + despesas recorrentes conhecidas.
- Semáforo de saúde: 🟢 saldo previsto positivo, 🟡 aperto, 🔴 negativo previsto.

## 20.6 Relatórios financeiros

| Relatório | Conteúdo |
|---|---|
| Demonstração de resultados simplificada | Receita − custo de material − comissões − despesas = resultado |
| Receita por serviço | Faturação, nº, ticket médio, % do total |
| Receita por profissional | Idem, com margem |
| Receita por zona | Identifica zonas que não compensam |
| Métodos de pagamento | Distribuição |
| Contas a receber | Faturas em aberto por antiguidade |
| Exportação para contabilidade | CSV/XLSX com todas as linhas do período |

## 20.7 Critérios de aceitação

- [ ] Não existem números de fatura duplicados nem saltos não justificados.
- [ ] O total da fatura = Σ linhas − descontos + deslocação + IVA, sempre, com teste de propriedade.
- [ ] Fechar caixa com diferença exige justificação.
- [ ] A previsão a 30 dias bate com a soma das marcações confirmadas.
- [ ] Toda a aritmética é feita em cêntimos inteiros; nenhum `Float` no código financeiro (teste de lint).

---

# 21. MÓDULO 14 — COMISSÕES

## 21.1 Modelo

Regras resolvidas por especificidade (`priority` desc, depois: profissional+serviço > profissional+categoria > profissional > serviço > default).

**Bases possíveis:**
- `SERVICE_REVENUE` — % sobre o valor dos serviços (sem deslocação, sem produtos).
- `NET_REVENUE` — % sobre o valor líquido (após descontos e, opcionalmente, material).
- `FIXED_PER_SERVICE` — valor fixo por serviço executado.

**Escalões:** múltiplas regras com `tierFromCents`/`tierToCents` permitem "40% até €2000/mês, 45% acima".

## 21.2 Cálculo

```
Ao concluir o atendimento, para cada AppointmentItem:
  base = item.totalCents
  se regra.deductMaterials: base −= custo real de material do item
  se NÃO regra.deductTravel: (a deslocação já não está no item)
  regra = resolverRegra(profissional, serviço, categoria, data)
  se escalonada:
     faturaçãoAcumuladaDoMês = Σ comissões base do mês
     aplicar a taxa do escalão correspondente
  amount = round(base × rateBps / 10000)   // half-up
  criar Commission{ status: PENDING, periodMonth, periodYear }
```

Estornos criam `Commission` negativa, nunca apagam a original.

## 21.3 Fecho mensal

Ecrã `/financeiro/comissoes`:
1. Selecionar mês e profissional.
2. Ver todas as comissões `PENDING` com o detalhe por atendimento.
3. Acrescentar bónus (meta atingida) e deduções (adiantamentos, material pessoal).
4. **Aprovar** → cria `Payout`, comissões passam a `APPROVED`.
5. **Marcar como pago** → `PAID`, gera recibo em PDF, envia por e-mail.

Só `OWNER` aprova (`commission:approve`).

## 21.4 Vista da profissional

`/equipa/eu/comissoes` — a profissional vê só as suas: quanto ganhou este mês, por atendimento, quanto falta para a meta, histórico de pagamentos. Nada de outras pessoas.

## 21.5 Critérios de aceitação

- [ ] Comissão de 40% sobre €60 = €24,00 exatos.
- [ ] Escalão 40%/45% a €2000 aplica corretamente a taxa em cada parcela.
- [ ] Estornar um atendimento pago gera comissão negativa e o `Payout` seguinte reflete-o.
- [ ] `PROFESSIONAL` não consegue ver comissões de terceiros, nem por API.
- [ ] Aprovar duas vezes o mesmo período é impossível (unique em `Payout`).

---

# 22. MÓDULO 15 — RELATÓRIOS, DASHBOARD E KPIs

## 22.1 Dashboard executivo (`/`)

Adaptado ao papel de quem entra.

**OWNER / MANAGER — 4 faixas:**

**Faixa 1 — Hoje**
`Atendimentos hoje` · `Faturação hoje` · `Próximo atendimento` · `Alertas` (stock baixo, consentimentos em falta, sinais por pagar)

**Faixa 2 — KPIs do mês** (cada um com variação vs. mês anterior)
| KPI | Definição |
|---|---|
| Faturação | Σ atendimentos concluídos |
| Nº atendimentos | Contagem |
| Ticket médio | Faturação ÷ nº |
| Clientes novas | 1.ª visita no período |
| Taxa de retenção | Clientes do mês anterior que voltaram |
| Taxa de rebooking | % que sai com a próxima já marcada |
| Ocupação | Minutos ocupados ÷ disponíveis |
| Taxa de no-show | No-shows ÷ confirmadas |
| Margem bruta | (Faturação − material − comissões) ÷ faturação |
| Custo de deslocação | Minutos em viagem × custo/hora estimado |

**Faixa 3 — Gráficos**
- Faturação diária (barras) com linha da média móvel a 7 dias.
- Receita por serviço (barras horizontais, top 8).
- Novas vs. recorrentes (barras empilhadas por mês, 12 meses).
- Ocupação por profissional (barras).
- Mapa de calor: dia da semana × hora, densidade de marcações.

**Faixa 4 — Listas de ação**
- Clientes em risco (top 10 por LTV) com botão "Contactar".
- Buracos na agenda desta semana.
- Faturas em aberto.
- Materiais em rutura iminente.

**PROFESSIONAL:** só a sua agenda de hoje, a rota, a sua faturação e comissão do mês, as suas clientes em risco.

## 22.2 Centro de relatórios (`/relatorios`)

Relatórios com: seletor de período (com comparação ao período homólogo), filtros (profissional, serviço, zona, tag), exportação CSV/XLSX/PDF, agendamento de envio por e-mail (semanal/mensal).

**Catálogo:**

| Área | Relatórios |
|---|---|
| Vendas | Receita por período, por serviço, por profissional, por zona, por método de pagamento |
| Clientes | Novas vs. recorrentes, retenção por coorte, LTV por coorte, fontes de aquisição, taxa de churn, top clientes |
| Operações | Ocupação, no-shows e cancelamentos, tempo de deslocação, produtividade por profissional, horas ociosas |
| Marketing | Desempenho de cupões, resgates de fidelidade, gift cards vendidos vs. usados, conversão de indicações, ROI por campanha |
| Stock | Consumo, custo por serviço, ruturas, desperdício |
| Financeiro | Ver 20.6 |

## 22.3 Análise de coortes

Tabela de retenção por mês de aquisição:

```
Coorte    M0    M1    M2    M3    M4    M5
Jan/26   100%  62%   48%   41%   38%   35%
Fev/26   100%  68%   52%   45%   40%    —
Mar/26   100%  71%   55%   48%    —     —
```

É o indicador que diz se o negócio está a melhorar na retenção.

## 22.4 Critérios de aceitação

- [ ] Os números do dashboard batem certo com os relatórios detalhados (mesma fonte de verdade, funções partilhadas).
- [ ] O dashboard carrega em < 1,5 s com 2 anos de dados (queries agregadas, não N+1).
- [ ] Exportar um relatório grava `AuditLog`.
- [ ] Todos os gráficos seguem as regras de cor da secção 28.6 e são legíveis em modo escuro.

---

# 23. MÓDULO 16 — DOCUMENTOS, ASSINATURA E RGPD 🔎

## 23.1 Documentos

- Upload por drag & drop, máx. 10 MB, tipos permitidos: PDF, PNG, JPG, HEIC, DOCX.
- Armazenamento em bucket **privado** do Supabase Storage; acesso apenas por URL assinada com 5 min de validade.
- Checksum SHA-256 guardado para detetar adulteração.
- Documentos marcados `isSensitive` exigem permissão específica e registam `VIEW_SENSITIVE`.
- Antivírus: verificação por ClamAV em job assíncrono (fase 8); até lá, restrição estrita de tipo MIME e extensão.

## 23.2 Modelos de documento e assinatura

- Editor de modelos com variáveis `{{cliente.nome}}`, `{{data}}`, `{{servico}}`, `{{profissional}}`.
- Modelos obrigatórios no arranque:
  1. **Consentimento informado — extensão de cílios** (riscos, cuidados, contraindicações).
  2. **Ficha de anamnese** (saúde ocular, alergias, medicação, lentes de contacto).
  3. **Consentimento de imagem** (uso de fotografias).
  4. **Política de privacidade e tratamento de dados**.
  5. **Política de cancelamento e no-show**.
- **Assinatura:** canvas HTML5 no telemóvel da profissional, a cliente assina com o dedo. Guarda PNG + IP + user agent + timestamp + hash do documento assinado.
- Versão do modelo é congelada na assinatura — alterar o modelo não altera documentos já assinados.

> 🔎 Confirmar na pesquisa a validade legal em Portugal desta forma de assinatura para consentimento informado em estética. Se for insuficiente, prever integração com assinatura qualificada (ex.: Chave Móvel Digital) na fase 8.

## 23.3 RGPD — implementação

### Base legal por finalidade

| Dados | Base legal |
|---|---|
| Nome, contacto, morada | Execução de contrato (art. 6.º-1-b) |
| Dados de saúde (alergias) | Consentimento explícito (art. 9.º-2-a) |
| Fotografias antes/depois (uso interno) | Interesse legítimo, com direito de oposição |
| Fotografias em redes sociais | Consentimento explícito, revogável |
| Marketing por WhatsApp/e-mail | Consentimento (art. 6.º-1-a) |
| Faturação | Obrigação legal (art. 6.º-1-c) |

### Funcionalidades obrigatórias

1. **Registo de consentimento** — texto exato, versão, data, método, IP. Nunca pré-marcado.
2. **Revogação em 1 clique** a partir da ficha e por resposta "PARAR".
3. **Direito de acesso** — exportação completa em JSON + PDF legível, gerada em `/definicoes/rgpd`.
4. **Direito de retificação** — edição normal, com registo em auditoria.
5. **Direito ao apagamento** — anonimização, não `DELETE`:
   ```
   Client.firstName  → "Cliente"
   Client.lastName   → "Anonimizada #<seq>"
   phone, email, morada, birthDate, taxId, notes → NULL
   ClientHealthRecord → apagado fisicamente
   Documentos e fotografias → apagados do Storage
   Appointments e Invoices → MANTIDOS (obrigação legal fiscal, 10 anos)
   Marca deletedAt e cria DataRequest concluído
   ```
6. **Portabilidade** — o mesmo JSON da exportação, em formato estruturado.
7. **Prazo de resposta** — `DataRequest.dueAt = criação + 30 dias`, com alerta aos 20 dias.
8. **Retenção automática** — job mensal anonimiza clientes sem atividade há > 5 anos e sem obrigação fiscal pendente. Avisa o `OWNER` 30 dias antes.
9. **Registo de atividades de tratamento** (art. 30.º) — página estática gerada em `/definicoes/rgpd/registo`.
10. **Notificação de violação** — runbook documentado em `docs/runbook.md` (72 h para a CNPD).

## 23.4 Critérios de aceitação

- [ ] Um consentimento revogado impede imediatamente o envio de marketing.
- [ ] A exportação RGPD inclui **todas** as tabelas com dados da cliente (teste que percorre o schema).
- [ ] O apagamento anonimiza mas mantém a integridade contabilística.
- [ ] Documentos só são acessíveis por URL assinada expirável — o URL direto do bucket dá 403.
- [ ] Alterar um modelo não altera documentos já assinados.

---

# 24. MÓDULO 17 — LOGS DE AUDITORIA

## 24.1 O que se regista

- Todas as escritas (`CREATE`, `UPDATE`, `DELETE`) com `before`/`after` em JSON, excluindo campos de segredo.
- Autenticação: `LOGIN`, `LOGIN_FAILED`, `LOGOUT`, `PASSWORD_CHANGED`, `MFA_ENABLED`.
- Acessos sensíveis: `VIEW_SENSITIVE` (saúde, IBAN, documentos sensíveis).
- Exportações: `EXPORT` com o tipo e o nº de registos.
- Alterações de permissões e papéis.
- Overrides de conflito de agenda, com o motivo.
- Ações administrativas em `Setting`.

## 24.2 Implementação

Extensão do Prisma Client (`$extends`) intercepta `create`, `update`, `delete` e escreve o `AuditLog` na **mesma transação**. Campos redigidos: `passwordHash`, `mfaSecret`, `iban`, `sessionToken`.

## 24.3 Ecrã (`/definicoes/auditoria`)

- Só `OWNER` (`audit:read`).
- Filtros: utilizador, ação, tipo de entidade, intervalo de datas, pesquisa por ID de entidade.
- Diff visual `before` → `after`.
- Exportação CSV.
- Retenção: 3 anos; depois arquivo comprimido no Storage.

## 24.4 Critérios de aceitação

- [ ] Nenhuma escrita de negócio existe sem `AuditLog` correspondente (teste que compara contagens após um cenário).
- [ ] O `AuditLog` não pode ser alterado nem apagado pela aplicação.
- [ ] Palavras-passe e IBAN nunca aparecem em texto claro no log.

---

# 25. MÓDULO 18 — MULTI-UNIDADE (PREPARADO)

## 25.1 O que se faz na v1

- Todas as tabelas já têm `unitId`.
- Todas as queries filtram por `unitId` através do helper de escopo.
- A sessão guarda `activeUnitId`.
- Existe um seletor de unidade no topbar, oculto quando há só uma.
- `UserUnit` permite que uma pessoa pertença a várias unidades com papéis diferentes.

## 25.2 O que fica para depois

- Relatórios consolidados multi-unidade.
- Transferência de stock entre unidades.
- Clientes partilhadas entre unidades (decisão de produto: partilhar ou isolar).
- Numeração de faturas por unidade (já suportada pelo unique composto).

## 25.3 Critério de aceitação

- [ ] Criar uma segunda unidade e verificar que **nenhum** dado da primeira aparece. Teste E2E obrigatório antes de encerrar a fase 2.

---

# 26. REGRAS DE NEGÓCIO TRANSVERSAIS

## 26.1 Datas e fusos

- Guardar sempre em UTC (`timestamptz`).
- Converter para `Europe/Lisbon` só na apresentação, com `date-fns-tz`.
- Cuidado com a mudança de hora (março e outubro): testes específicos para marcações nesses dias.
- Formatos pt-PT: data `dd/MM/yyyy`, hora `HH:mm`, data longa `5 de agosto de 2026`.

## 26.2 Dinheiro

- Tudo `Int` em cêntimos.
- `formatEUR(6000)` → `"60,00 €"` (espaço antes do símbolo, vírgula decimal — norma pt-PT).
- Arredondamento **half-up** em percentagens, documentado e testado.
- IVA: guardar em basis points; a taxa de 23% aplica-se a serviços de estética em Portugal continental — **confirmar com o contabilista**.

## 26.3 Telefones

- Normalizar para E.164 na gravação (`+351933055502`).
- Aceitar entrada em qualquer formato (`933 055 502`, `933055502`, `+351 933055502`).
- Apresentar formatado (`933 055 502`).
- Usar `libphonenumber-js` com região por defeito `PT`.

## 26.4 Códigos legíveis

| Entidade | Formato | Exemplo |
|---|---|---|
| Marcação | `AYA-DDMM-XXX` | `AYA-0508-K7P` |
| Gift card | `AYA-GIFT-XXXX` | `AYA-GIFT-7K2M` |
| Benefício/recompensa | `AYA-XXXX` | `AYA-J8AU` |
| Fatura | `YYYY/NNNN` | `2026/0042` |

Alfabeto sem ambiguidade: `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`.

## 26.5 Idempotência

Todas as operações que enviam mensagens, cobram ou alteram stock aceitam uma `idempotencyKey`. Repetir a mesma chave devolve o resultado original sem repetir o efeito.

## 26.6 Erros

```ts
class AppError extends Error {
  constructor(
    public code: string,        // "TRAVEL_CONFLICT_NEXT"
    public message: string,     // mensagem em pt-PT para o utilizador
    public status: number = 400,
    public details?: unknown
  ) { super(message); }
}
```

Mensagens de erro sempre em pt-PT, sempre acionáveis: não *"Erro ao gravar"*, mas *"Não é possível marcar às 11:45 — a Sofia precisa de 38 min para vir de Cascais e só tem 20."*

---

# 27. SUPERFÍCIE DE API

## 27.1 Convenções

- Server Actions para mutações a partir da UI.
- Route Handlers (`/api/...`) para webhooks, cron e integrações.
- Validação com Zod em **todas** as entradas.
- Respostas: `{ ok: true, data }` ou `{ ok: false, error: { code, message, details } }`.

## 27.2 Rotas principais

```
POST   /api/auth/[...nextauth]

GET    /api/cron/reminders            → envia lembretes pendentes
GET    /api/cron/recalc-metrics       → métricas de clientes
GET    /api/cron/client-status        → recalcula estados
GET    /api/cron/expire-rewards       → expira recompensas não usadas
GET    /api/cron/low-stock            → alertas de stock
GET    /api/cron/fill-gaps            → sugestões de preenchimento
GET    /api/cron/gdpr-retention       → anonimização por retenção
GET    /api/cron/process-queue        → processa JobQueue

POST   /api/webhooks/whatsapp         → receção de mensagens e estados
GET    /api/webhooks/whatsapp         → verificação da Meta
POST   /api/webhooks/email            → bounces e reclamações

GET    /api/availability              → slots (usado pelo modal e, futuramente, pelo site)
POST   /api/appointments              → criar (com todas as validações)
PATCH  /api/appointments/:id/status   → transição de estado
POST   /api/coupons/validate          → validação de cupão
GET    /api/documents/:id/url         → URL assinada
```

Todas as rotas `/api/cron/*` exigem cabeçalho `Authorization: Bearer ${CRON_SECRET}`.

## 27.3 API pública futura (`/api/v1`)

Preparada mas **não implementada** na v1. Serviria para o site público marcar diretamente. Requereria: chaves de API por unidade, rate limiting, escopo reduzido (só disponibilidade e criação de pedido em estado `REQUESTED`).

---

# 28. UI/UX E DESIGN SYSTEM

## 28.1 Identidade

Paleta real do site AYAHA MAISON (usar exatamente estes valores):

| Token | Valor | Uso |
|---|---|---|
| `--onyx` | `#0E0E0E` | Texto principal, fundo escuro |
| `--graphite` | `#1A1A1A` | Superfície nível 1 em modo escuro |
| `--graphite-2` | `#242424` | Superfície nível 2, cards elevados |
| `--gold` | `#C4A870` | Acento, ações primárias, marca |
| `--gold-light` | `#D8C39A` | Hover, realces, gradientes |
| `--ivory` | `#F7F5F1` | Fundo principal em modo claro |
| `--pearl` | `#FBFAF8` | Superfície de cards em modo claro |
| `--blush` | `#E7D3CE` | Acento feminino suave, fundos de destaque |
| `--rose` | `#C99A93` | Acento secundário, badges |
| `--taupe` | `#B3A292` | Texto secundário, bordas |

**Tipografia:** Cormorant Garamond (títulos, display) + Jost (interface, dados).

## 28.1.1 Decisão de identidade: dark/gold vs. branco/floral

A fundadora tem uma dúvida em aberto (o site é preto/dourado, a marca no Canva é
branco/floral/suave). **Para o CRM esta dúvida não se aplica** e não deve
bloquear nada:

- O **site** é marketing — a identidade tem de seduzir e é decisão de marca.
- O **CRM** é ferramenta de trabalho — a identidade tem de ser legível durante
  8 horas seguidas, muitas vezes num telemóvel à porta de casa de uma cliente.

**Decisão para o CRM:** modo claro por defeito (`--ivory`/`--pearl` de fundo,
`--onyx` de texto), com dourado só em acentos e ações primárias. Modo escuro
disponível para uso noturno. O blush e o rose entram em badges e estados, não em
grandes áreas.

Isto mantém coerência de marca sem sacrificar a legibilidade, e é indiferente à
decisão que a fundadora venha a tomar para o site.

> ⚠️ **Nota importante:** o site é uma peça de marketing de luxo. O CRM é uma **ferramenta de trabalho**. Manter as cores e tipos da marca, mas privilegiar densidade de informação, legibilidade e velocidade sobre elegância. Menos espaço em branco, mais dados por ecrã.

## 28.2 Estados semânticos

| Estado | Cor |
|---|---|
| Sucesso / Concluído | `#2F7A4F` |
| Aviso / Em risco | `#B8860B` |
| Erro / Crítico | `#A33A3A` |
| Informação | `#3A6EA5` |
| Neutro / Cancelado | `#8A8A8A` |

## 28.3 Layout

- **Sidebar** fixa à esquerda (colapsável), com os módulos.
- **Topbar** com pesquisa global (`Cmd/Ctrl+K`), seletor de unidade, notificações, avatar.
- **Conteúdo** com largura máxima de 1600 px, exceto agenda e mapa (largura total).
- **Mobile:** sidebar vira menu inferior com 5 itens (Agenda, Clientes, Atendimentos, Stock, Mais).

## 28.4 Componentes obrigatórios

`DataTable` (com estado vazio, carregamento e erro) · `ClientAvatar` · `StatusBadge` · `MoneyDisplay` · `DateTimeDisplay` · `PhoneLink` (com ação WhatsApp) · `AddressDisplay` (com botão de mapa) · `Timeline` · `EmptyState` · `ConfirmDialog` · `PermissionGate` · `AuditNote`.

## 28.5 Acessibilidade

- Contraste mínimo AA (4,5:1 para texto normal).
- Todos os controlos acessíveis por teclado, com foco visível.
- Cor **nunca** é a única portadora de informação (os estados têm ícone e texto).
- `aria-live` nas atualizações da agenda.
- Alvos de toque ≥ 44 px em mobile.

## 28.6 Regras para gráficos

- Máximo 6 séries por gráfico; acima disso, agrupar em "Outros".
- Paleta categórica derivada do dourado com variação de matiz e luminosidade, validada para daltonismo.
- Escalas sequenciais para heatmaps (claro → dourado → onyx).
- Eixo Y sempre começa em zero em gráficos de barras.
- Valores monetários formatados com `formatEUR`, nunca decimais crus.
- Todos os gráficos legíveis em modo claro **e** escuro.
- Sempre um estado vazio explícito ("Sem dados no período selecionado").

## 28.7 Modo escuro

Suportado desde o início, via `prefers-color-scheme` + interruptor manual persistido. A agenda em modo escuro é o caso mais crítico — testar contraste dos blocos coloridos.

---

# 29. SEGURANÇA

| Área | Medida |
|---|---|
| Palavras-passe | Argon2id, mínimo 10 caracteres, verificação contra lista de comprometidas (HIBP k-anonymity) |
| Sessões | httpOnly, secure, sameSite=lax, rotação no login, invalidação global no logout de todos os dispositivos |
| CSRF | Tokens em Server Actions (nativo do Next.js) + verificação de `Origin` |
| Cabeçalhos | CSP restritiva, HSTS, X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy |
| Rate limiting | Login 5/15min por IP+e-mail; API 100/min por sessão; webhooks por assinatura |
| Injeção SQL | Prisma parametrizado; nenhuma query crua com interpolação |
| XSS | React escapa por defeito; `dangerouslySetInnerHTML` proibido exceto em templates sanitizados com DOMPurify |
| Upload | Validação de MIME real (magic bytes), não só extensão; nomes gerados; bucket privado |
| Segredos | Apenas em variáveis de ambiente; `.env` no `.gitignore`; rotação documentada |
| Dados em repouso | `iban` e `mfaSecret` encriptados com AES-256-GCM, chave em env (`ENCRYPTION_KEY`) |
| Backups | Diários automáticos do Supabase + exportação semanal para armazenamento independente; **restauro testado trimestralmente** |
| Dependências | `npm audit` no CI; Dependabot ativo |
| Logs | Nunca registar palavras-passe, tokens, dados de saúde ou IBAN |

---

# 30. TESTES E QUALIDADE

## 30.1 Pirâmide

| Nível | Ferramenta | Cobertura alvo |
|---|---|---|
| Unitário (lógica de negócio) | Vitest | **≥ 85%** em `src/server/services/` |
| Integração (serviço + BD) | Vitest + Postgres em Docker | Fluxos críticos |
| E2E | Playwright | 12 percursos principais |

## 30.2 Testes obrigatórios (não negociáveis)

**Disponibilidade e deslocação**
- Sobreposição simples é rejeitada.
- Deslocação impossível é rejeitada.
- Slot devolvido pelo motor grava sempre sem erro (teste de propriedade com 200 casos aleatórios).
- Mudança de hora de verão/inverno.
- Cache de `TravelEstimate` evita chamadas repetidas.

**Dinheiro**
- Total = Σ linhas − descontos + deslocação + IVA (teste de propriedade).
- Ordem de aplicação de descontos, 8+ combinações.
- Comissão com escalões.
- Gift card com uso parcial e estorno.
- Nenhum `Float` no código financeiro (regra de ESLint personalizada).

**Permissões**
- Para cada papel × cada rota: acesso concedido ou 403, tabela exaustiva.
- `PROFESSIONAL` não acede a dados de outra, nem por ID direto.

**RGPD**
- Exportação inclui todas as tabelas com dados da cliente.
- Anonimização preserva a integridade financeira.
- Consentimento revogado bloqueia envio.

**Multi-tenant**
- Nenhuma query devolve dados de outra unidade (teste que corre com 2 unidades povoadas).

## 30.3 Percursos E2E

1. Login → dashboard.
2. Criar cliente com morada e consentimento.
3. Marcar atendimento a partir de slot sugerido.
4. Tentar marcar em conflito de deslocação → erro claro.
5. Arrastar marcação na agenda.
6. Executar atendimento no telemóvel (chegou → começou → terminou → pagamento).
7. Conclusão gera fatura, abate stock, carimba o cartão e cria comissão.
8. Cancelar → oferta à lista de espera → aceitação.
9. Completar o 5.º carimbo, escolher recompensa e usá-la no atendimento seguinte.
10. Usar gift card parcialmente.
11. Fechar caixa com diferença.
12. Aprovar comissões do mês e gerar payout.

## 30.4 CI (GitHub Actions)

```
push / PR →
  install → lint → typecheck → test:unit → test:integration → build
  em PR para main: + test:e2e
```

Nenhum merge para `main` com o pipeline vermelho.

---

# 31. DEPLOY E AMBIENTES

## 31.1 Ambientes

| Ambiente | BD | Domínio | Notas |
|---|---|---|---|
| Local | Postgres em Docker | `localhost:3000` | Seed com dados fictícios |
| Staging | Projeto Supabase separado | `staging.crm.ayaha…` | Dados anonimizados |
| Produção | Supabase | `crm.ayahamaison.com` | Backups diários |

## 31.2 Variáveis de ambiente

```bash
# Base de dados
DATABASE_URL=
DIRECT_URL=                  # para migrações (pooler bypass)

# Auth
AUTH_SECRET=
AUTH_URL=

# Supabase Storage
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_STORAGE_BUCKET=ayaha-crm

# WhatsApp
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_TOKEN=
WHATSAPP_VERIFY_TOKEN=
WHATSAPP_APP_SECRET=

# E-mail
RESEND_API_KEY=
EMAIL_FROM="AYAHA MAISON <ola@ayahamaison.com>"

# Mapas
MAPS_PROVIDER=google          # google | openroute | haversine
GOOGLE_MAPS_API_KEY=
OPENROUTE_API_KEY=

# Cron
CRON_SECRET=

# Encriptação
ENCRYPTION_KEY=               # 32 bytes em base64

# App
NEXT_PUBLIC_APP_URL=
DEFAULT_UNIT_SLUG=benfica
```

## 31.3 Alojamento

**Vercel** (frontend + funções) + **Supabase** (BD, storage, cron).

⚠️ Notas de plataforma, aprendidas com o site:
- O disco na Vercel é efémero — nada de ficheiros locais, tudo no Storage.
- Server Actions e Route Handlers implicam runtime Node — não há exportação estática.
- Configurar `vercel.json` com os cron jobs a chamar `/api/cron/*`.
- O `maxDuration` das funções tem de ser aumentado para os jobs pesados (relatórios, exportações).

## 31.4 Migrações

- `prisma migrate dev` em local, `prisma migrate deploy` em CI.
- **Nunca** `prisma db push` fora de local.
- Migrações destrutivas exigem revisão manual e backup prévio.
- Cada migração acompanhada de nota em `docs/adr/` se alterar semântica.

---

# 32. PLANO DE EXECUÇÃO POR FASES

> Uma fase por sessão de trabalho. **Não avançar sem a anterior fechada e testada.**

## Fase 0 — Fundações (Opus)
**Objetivo:** projeto a arrancar, BD ligada, autenticação a funcionar.
- Scaffold Next.js 15 + TS strict + Tailwind + shadcn.
- Prisma + Supabase ligados; primeira migração com o schema **completo** da secção 6.2.
- Constraints SQL da secção 6.3.
- Auth.js com credenciais, sessão em BD, Argon2id.
- `src/server/permissions.ts` com a matriz da secção 7.2.
- Layout base: sidebar, topbar, shell autenticado.
- Seed: 1 unidade, 1 OWNER, 3 profissionais, **os 7 serviços reais a €30**, 5 zonas, programa de fidelidade com as 3 recompensas, 20 clientes fictícias com cartões em vários estados.
- CI a passar.

**Feito quando:** login funciona, o dashboard vazio carrega, `npm run build` e `npm test` passam.

## Fase 1 — CRM de Clientes (Sonnet, revisão Opus)
Módulos 1 e 3. Lista, ficha, criação, tags, notas, timeline básica, catálogo de serviços com BOM.

**Feito quando:** os critérios de 8.5 e 10.3 passam.

## Fase 2 — Equipa, horários e multi-tenant (Sonnet)
Módulos 2, 5 e 18. Perfis, competências, horários, ausências, feriados, teste de isolamento entre unidades.

**Feito quando:** os critérios de 9.4, 12.4 e 25.3 passam.

## Fase 3 — Agenda e deslocação ⭐ (Opus)
**A fase mais difícil. Não delegar.** Módulos 4, 6 e 7.
- `availability.ts` completo, com testes de propriedade.
- `travel.ts` com cache e fallback.
- Vistas de agenda (dia, semana, mês, lista, mapa).
- Modal de marcação em 4 passos.
- Kanban de atendimentos e máquina de estados.
- Ecrã de execução mobile.

**Feito quando:** os critérios de 11.6, 13.5 e 14.5 passam, incluindo o teste de propriedade dos 200 slots.

## Fase 4 — Financeiro e comissões (Opus)
Módulos 13 e 14. Faturação, pagamentos, caixa, despesas, fluxo de caixa, comissões, payouts.

**Feito quando:** os critérios de 20.7 e 21.5 passam.

## Fase 5 — Stock e fidelidade (Sonnet)
Módulos 11 e 12. Materiais, movimentos, alertas, encomendas, cartão de carimbos, recompensas, gift cards, cupões.

**Feito quando:** os critérios de 18.4 e 19.4 passam.

## Fase 6 — Comunicações (Opus para a integração, Sonnet para a UI)
Módulo 10. WhatsApp Cloud API, templates, webhook, e-mail, fila de jobs, lembretes automáticos, lista de espera (módulo 9).

**Feito quando:** os critérios de 16.4 e 17.4 passam.

## Fase 7 — Documentos, RGPD e auditoria (Opus)
Módulos 16 e 17. Upload, modelos, assinatura em canvas, consentimentos, pedidos de titular, retenção, logs.

**Feito quando:** os critérios de 23.4 e 24.4 passam.

## Fase 8 — Relatórios e polimento (Sonnet, revisão Opus)
Módulo 15. Dashboard, relatórios, coortes, exportações. Mais: MFA, PWA, modo offline básico da agenda, Realtime.

**Feito quando:** os critérios de 22.4 passam e os 12 percursos E2E estão verdes.

## Estimativa

| Fase | Sessões | Modelo dominante |
|---|---|---|
| 0 | 1–2 | Opus |
| 1 | 2–3 | Sonnet |
| 2 | 2 | Sonnet |
| 3 | 4–6 | **Opus** |
| 4 | 3–4 | Opus |
| 5 | 2–3 | Sonnet |
| 6 | 3–4 | Misto |
| 7 | 2–3 | Opus |
| 8 | 3–4 | Sonnet |
| **Total** | **22–31 sessões** | — |

---

# 33. DEFINITION OF DONE

Uma fase só está concluída quando **todos** os pontos abaixo se verificam:

- [ ] Todos os critérios de aceitação dos módulos da fase passam.
- [ ] `npm run lint` sem avisos.
- [ ] `npm run typecheck` sem erros (`strict: true`, sem `any` sem justificação em comentário).
- [ ] `npm run test` verde, cobertura ≥ 85% em `src/server/services/`.
- [ ] `npm run build` sem erros nem avisos novos.
- [ ] Nenhuma query sem filtro de `unitId`.
- [ ] Nenhuma escrita sem `AuditLog`.
- [ ] Nenhum valor monetário em `Float`.
- [ ] Ecrãs testados em 375 px, 768 px e 1440 px.
- [ ] Modo claro e escuro verificados.
- [ ] Textos todos em pt-PT, sem strings em inglês na UI.
- [ ] Migração aplicada em staging sem erros.
- [ ] `CLAUDE.md` atualizado com o que mudou.
- [ ] Commit com mensagem descritiva; sem segredos no repositório.

---

## ANEXO A — Perguntas em aberto para a dona do negócio

✅ **Já respondido (2026-07-27):** preços (€30 uniformes, 7 serviços), regra de
fidelidade (5 carimbos, 3 recompensas), paleta de cor, modelo de negócio.

### 🔴 Bloqueia a Fase 4 (financeiro)

1. **IVA** — está no regime normal (23%) ou na isenção do art. 53.º do CIVA?
   Com faturação de negócio com 1 ano, é muito provável que esteja na **isenção
   do art. 53.º** (limite €15.000/ano em 2025-2026). Isto muda tudo: sem IVA nas
   faturas, com menção obrigatória *"IVA — regime de isenção (art. 53.º do CIVA)"*.
   **Enquanto não responder, o CRM assume isenção e mostra o aviso na fatura.**
2. **Percentagem de comissão** — qual é o acordo real com as técnicas? (40% é
   referência de mercado, mas com preço de €30 e 120 min de trabalho isso dá €12
   por 2 horas — pode não fazer sentido.)
3. **Tipo de contrato das técnicas** — recibos verdes ou contrato de trabalho?
4. **Software de faturação certificado** — qual usa o contabilista? Determina o
   formato de exportação.

### 🟡 Bloqueia a Fase 3 (agenda/deslocação)

5. **Taxas de deslocação por zona** — os valores de 13.1 são propostas minhas.
   **Quanto se cobra hoje, na prática?** Cobra-se alguma coisa? Com serviço a
   €30, uma taxa de €10 é 33% do valor — é decisivo para a rentabilidade.
6. **Raio máximo de atendimento** — aceita-se Margem Sul? Sintra? Cascais?
   Qual é o limite real hoje?
7. **Sinal/depósito** — cobra-se sinal para garantir a marcação? De quanto?
   (Com atendimento ao domicílio, um no-show custa a deslocação inteira.)
8. **Política de cancelamento** — a de 14.3 é uma proposta. Qual é a regra real?

### 🟢 Bloqueia a Fase 5 (fidelidade)

9. **Recompensa nº2 "upgrade de técnica gratuito"** — não tem valor económico
   com preço único de €30 (ver aviso em 18.1). Qual das opções A/B/C/D?
   **Recomendo a A: "6.º atendimento grátis".**
10. **Recompensa por indicação** — quer dar 1 carimbo extra a quem indica uma
    amiga que conclua o primeiro atendimento?

### 🔵 Não bloqueia nada

11. **Fotos em redes sociais** — quer o fluxo de consentimento de imagem desde a v1?
12. **Depoimentos** — os do site são fabricados. O CRM pode recolher avaliações
    reais automaticamente após o 3.º atendimento e alimentar o site. Quer isso?

---

## ANEXO C — Observações sobre o negócio (não pedidas, mas relevantes)

Coisas que saltaram à vista ao modelar os dados. Não são bloqueios, são avisos.

### C.1 O preço único de €30 é o maior risco do negócio

Um Volume Russo de 120 minutos a €30 rende **€15/hora brutos**, antes de
material, deslocação e impostos. Depois de descontar ~€4 de material e ~30 min
de deslocação, a margem real aproxima-se de **€8-9/hora**. Isso está abaixo do
salário mínimo português por hora efetiva de trabalho.

O CRM vai tornar isto visível pela primeira vez (relatório de receita por hora
ocupada). **Espera-se que os números sejam desconfortáveis.** É esse o objetivo:
não se pode corrigir o que não se mede.

Caminhos possíveis, por ordem de facilidade:
1. Diferenciar preço por duração (90 min = €30, 120 min = €40). Um serviço mais
   demorado é objetivamente mais trabalho.
2. Cobrar deslocação a sério fora de Lisboa centro.
3. Agrupar marcações por zona no mesmo dia (o CRM já otimiza isto).
4. Aumentar preço geral — Lisboa pratica €40-70 em extensão de cílios.

### C.2 A frequência importa mais do que o preço

Com preço fixo, a única alavanca de receita é **quantas vezes cada cliente
volta**. Daí a importância desproporcional de:
- lembrete de manutenção aos 18 dias (gap de 21);
- taxa de rebooking (sair com a próxima já marcada);
- deteção de clientes em risco.

Estes três são os KPIs que a fundadora deve olhar todos os dias. O dashboard
coloca-os na Faixa 2.

### C.3 O cartão de 5 carimbos custa 20% da receita

5 atendimentos = €150. A recompensa vale €15. É **10%** de desconto efetivo —
razoável e sustentável. Mas se a opção A for adotada (6.º grátis), passa a
€30 em €180 = **16,7%**. Continua defensável para retenção, mas convém saber
o número.

### C.4 Risco operacional: uma pessoa só

Com 1-2 profissionais, uma doença ou uma gravidez para o negócio. O CRM ajuda
(lista de espera, reagendamento em massa, histórico transferível entre técnicas)
mas não resolve. A gestão de equipa (Fase 2) é mais importante do que parece
para um negócio deste tamanho.

---

## ANEXO B — Prompt de arranque (retirado)

Aqui estava um prompt para colar no início de cada sessão de implementação.
Mandava ler esta especificação inteira antes de escrever código, e repetia
uma lista de regras que hoje vive no `AGENTS.md`.

Saiu em 10/08/2026 por duas razões: o projeto já está construído, e o
`AGENTS.md` é carregado sozinho em cada sessão — não é preciso colar nada.

O arranque de sessão hoje é uma frase:

```
Lê docs/PROXIMO-PASSO.md e a pasta Desktop/AYAHA-SKILLS, depois continua.
```
---

*Fim do documento. Versão 1.0 — 2026-07-27.*
