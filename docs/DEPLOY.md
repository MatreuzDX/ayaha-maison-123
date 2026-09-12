# Publicar o AYAHA CRM

Guia para pôr o sistema no ar. Ler até ao fim antes de começar — há dois passos
que, se ficarem por fazer, deixam dados de clientes expostos.

---

## 1. Base de dados

O Postgres embebido (`npm run db:start`) serve para desenvolver. Em produção é
preciso uma base gerida, com cópias de segurança automáticas.

**Requisito não negociável:** a base tem de ser criada em **UTF8**. Muitos
fornecedores usam a codificação do sistema por omissão, e em Windows isso é
WIN1252 — que estraga acentos e rebenta com as migrações deste projeto.

**Estado a 13/09/2026: banco no Supabase `ayaha-crm` (`sjidqzuelheuhopapmff`,
Frankfurt), ligado à Vercel pela variável `DATABASE_URL`.** Utilizador próprio
`ayaha_app`, pooler de sessão `aws-0-eu-central-1.pooler.supabase.com:5432`,
endereço com `?sslmode=require&uselibpqcompat=true` — só `sslmode=require` deixa
as migrações passar e parte a app no certificado. Não ligar bancos do marketplace
da Vercel ao projeto sem confirmar que ficam ativos: um recurso suspenso bloqueia
todos os deploys (`Resource provisioning failed`).

~~**Decisão de 12/09/2026: o banco vive dentro da Vercel.**~~ Revertida a 13/09 a
pedido do Mateus. O Mateus quer tudo só
em GitHub + Vercel, sem contas à parte. O banco Supabase original
(`qyrsnefjlnesvecyenoi`) desapareceu e deixou o site em erro 500; o plano
gratuito do Supabase já estava no limite de 2 projetos.

Criar em: projeto **ayaha-crm** na Vercel → **Storage** → **Create Database** →
**Neon** → região **Frankfurt** → ligar ao projeto (Production e Preview). A
Vercel cria sozinha `DATABASE_URL` (pooler, usada pela app) e
`DATABASE_URL_UNPOOLED` (direta, usada pelas migrações — ver `prisma.config.ts`).

Se já existir um `DATABASE_URL` antigo nas variáveis, **apagá-lo antes**, senão a
ligação do banco entra em conflito. Neon já vem em UTF8.

Confirmar a codificação depois de criar:

```sql
SELECT datname, pg_encoding_to_char(encoding) FROM pg_database;
```

Tem de dizer `UTF8`. Se disser outra coisa, apagar e recriar assim:

```sql
CREATE DATABASE ayaha_crm ENCODING 'UTF8' TEMPLATE template0;
```

---

## 2. Repositório no GitHub

O código vive em **`github.com/MatreuzDX/ayaha-maison-123`** (público, por
regra do Mateus) e o projeto **ayaha-crm** da Vercel está ligado a esse
repositório. **Publicar é `git push` para `main`** — a Vercel faz o build e põe
no ar sozinha.

Antes de enviar, confirmar que nenhum segredo vai junto:

```bash
git ls-files | grep -E '(^|/)\.env'
```

Só pode aparecer `.env.example`. Ligações e chaves ficam em `.env` e
`.env.local`, que o `.gitignore` já exclui.

---

## 3. Variáveis de ambiente no Vercel

Em **Settings → Environment Variables**, no ambiente *Production*:

| Variável | Valor | Notas |
|---|---|---|
| `DATABASE_URL` | `postgresql://…` | Ligação direta, não o pooler |
| `NEXT_PUBLIC_APP_URL` | `https://…vercel.app` | O domínio real |
| `DEFAULT_UNIT_SLUG` | `benfica` | |
| `ENCRYPTION_KEY` | 32 bytes em base64 | Ver abaixo |
| `CRON_SECRET` | aleatório | Protege `/api/cron/*` |
| `SEED_OWNER_EMAIL` | o e-mail da fundadora | Só para o primeiro seed |
| `SEED_OWNER_PASSWORD` | palavra-passe forte | Só para o primeiro seed |

**`DEMO_MODE` não deve existir em produção.** Não a definir como `"false"` —
simplesmente não a criar. Se estiver ligada, a aplicação recusa arrancar e o
build falha. É intencional: impede que o botão de entrada sem palavra-passe
chegue a um sistema com dados reais de clientes.

Gerar os segredos:

```bash
node -e "console.log('ENCRYPTION_KEY=' + require('crypto').randomBytes(32).toString('base64'))"
```

```bash
node -e "console.log('CRON_SECRET=' + require('crypto').randomBytes(32).toString('base64url'))"
```

---

## 4. Primeiro arranque

**Não há nada para correr à mão.** O `buildCommand` do `vercel.json` chama
`prisma/preparar-banco.mjs` antes do `next build`, em cada deploy de produção:

1. `prisma migrate deploy` — aplica as migrações em falta.
2. O seed, que é idempotente — unidade, 7 serviços a €30, zonas de deslocação,
   AYAHA Club. **Nunca cria clientes nem equipa inventadas em produção.**

Se a migração falhar, o build falha e a Vercel mantém o deploy anterior no ar —
o código novo nunca chega antes da coluna nova (ver
`AYAHA-SKILLS/deploy-vercel-seguro`). Deploys de pré-visualização saltam este
passo, para um ramo experimental não mexer no schema de produção.

**Sem banco nenhum** (`DATABASE_URL` por definir), o deploy segue com um aviso:
o site público mostra o catálogo base de `src/lib/catalog.ts` e o login/CRM
não funcionam até o banco existir.

**Com `DATABASE_URL` a apontar para um banco que não responde**, o build só segue
se este deploy **não trouxer migrações novas** desde o último deploy de produção
bem-sucedido (compara `prisma/migrations` com `VERCEL_GIT_PREVIOUS_SHA`). Se
trouxer, ou se não der para confirmar, o build **para** — é o que impede código
novo de ir para o ar à frente do banco. Uma migração que falhe com o banco a
responder (erro de SQL) para sempre o build.

**Exceção — o banco não existe.** Se o servidor responder que o banco foi apagado
(`tenant/user ... not found` do Supabase, `P1003`, `database ... does not exist`),
o build segue com aviso, como sem `DATABASE_URL`: não há schema que possa ficar
atrás do código. `ENOTFOUND` sozinho não conta — uma falha de DNS pode passar.

**Conta de administração:** definir `SEED_OWNER_EMAIL` e `SEED_OWNER_PASSWORD`
(10+ caracteres) nas variáveis e fazer **Redeploy**. Sem elas o site público
funciona, mas não se cria conta nenhuma — nunca uma palavra-passe por defeito.
Depois de entrar, seguir a secção 5.

---

## 5. Fechar a porta (importante)

Depois de entrar pela primeira vez e confirmar que tudo funciona:

1. **Mudar a palavra-passe** pela interface.
2. **Apagar `SEED_OWNER_PASSWORD`** das variáveis do Vercel.
3. **Confirmar que `DEMO_MODE` não existe** em produção.

O passo 2 é fácil de esquecer. Uma palavra-passe que fica numa variável de
ambiente é uma palavra-passe que qualquer pessoa com acesso ao painel do Vercel
consegue ler.

---

## 6. Verificar que ficou seguro

```bash
curl -I https://o-seu-dominio.vercel.app/clientes
```

Tem de responder `307` com `location: /login`. Se responder `200`, a proteção
de rotas não está a funcionar — não continuar até resolver.

Confirmar também que o botão de demonstração **não** aparece no ecrã de entrada.

---

## Notas sobre o RGPD

O sistema guarda dados de saúde das clientes (alergias, sensibilidade à cola),
que são categoria especial ao abrigo do artigo 9.º. Isso traz obrigações:

- O acesso a esses dados já é registado em `AuditLog` — não desligar.
- É preciso um contrato de subcontratação com o fornecedor da base de dados.
  Supabase, Neon e Vercel têm modelos próprios.
- Preferir alojamento na União Europeia. No Vercel, escolher uma região da UE
  (por exemplo `fra1`); no Supabase, uma região europeia.

Isto não é conselho jurídico. Antes de pôr dados reais de clientes no ar, vale
a pena confirmar com quem trate da proteção de dados do negócio.
