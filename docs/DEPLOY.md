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

Opções que funcionam bem para este caso:

| Fornecedor | Notas |
|---|---|
| **Supabase** | Plano gratuito chega para começar. Já vem em UTF8. |
| **Neon** | Bom para Vercel; escala a zero fora de horas. |
| **Railway** | Simples, mas confirmar a codificação. |

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

O projeto ainda não tem commits. A partir da pasta:

```bash
git init
git add .
git commit -m "AYAHA CRM: fundações, clientes, agenda e catálogo"
```

Antes de enviar, confirmar que o `.env` **não** vai junto:

```bash
git status --short
```

Se aparecer `.env` na lista, parar e corrigir o `.gitignore` — esse ficheiro
tem a palavra-passe da base de dados e a chave de encriptação.

Depois criar o repositório (privado) e enviar:

```bash
gh repo create ayaha-crm --private --source=. --push
```

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

O Vercel faz o build automaticamente. Depois é preciso preparar a base uma vez:

```bash
npx prisma migrate deploy
```

```bash
npm run db:seed
```

O seed cria a unidade, a equipa, os 7 serviços a €30, as zonas de deslocação e
o AYAHA Club. **Não cria clientes de demonstração em produção** se já existirem
registos — é idempotente.

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
