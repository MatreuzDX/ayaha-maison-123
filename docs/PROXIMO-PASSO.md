# Próximo passo

**Atualizado a 16 de agosto de 2026.**

## Antes de tocar em código

Ler, por esta ordem:

1. `C:\Users\Mateus\Desktop\AYAHA-SKILLS\` — erros já cometidos e como
   evitá-los. Sobretudo `deploy-vercel-seguro` e `verificar-a-serio`.
2. `AGENTS.md` — resumo operacional do projeto.
3. `docs/stack-2026-08-08/README.md` — stack, ligações, armadilhas.

## Estado a 16 de agosto

Em produção, em `ayaha-crm.vercel.app`. **174 testes**, lint e build
limpos.

### Site público
Completo: início, sobre, serviços (+ página por serviço), galeria com
trabalho real (2 fotos e 1 vídeo de cliente), depoimentos, FAQ, contacto,
AYAHA Club. Fixo em modo claro (`.site-light`) — ver a nota abaixo.

### Portal da cliente (`/conta`)
Navegação própria com Início, Marcações, Histórico, Benefícios, Perfil e
Segurança. A cliente marca sozinha em `/conta/marcar` (serviço →
profissional → dia → hora), e o pedido nasce em `REQUESTED` para a equipa
confirmar.

### CRM (`/app`)
No topo do painel: **pedidos de acesso** (aprovar/recusar), **marcações a
lembrar** (48h/24h/2h antes, WhatsApp a um clique) e **clientes na altura
do retoque** (idem). Gestão de acesso na ficha de cada cliente: alterar
e-mail, definir palavra-passe nova, remover acesso.

### Site — link social
O Instagram do rodapé apontava para `ayahamaison` — invertido, o perfil
real é `@maisonayaha`. Corrigido a 15/08. Facebook e TikTok saíram: nenhum
dos dois existe (confirmado ao vivo). Ver [[ayaha-crm]] na memória.

## O que falta

| O quê | Notas |
|---|---|
| **Publicar no GitHub** | O git é local, sem remote. Precisa do Mateus para autenticar — o terminal do agente não tem TTY para o Git Credential Manager. |
| **Trocar "upgrade de técnica"** | Decisão da fundadora. Com preço único de €30 essa recompensa não vale nada; sugerido "6.º atendimento grátis". Muda-se nas Definições do CRM. |
| **Depoimentos reais** | O site tem estado vazio honesto. Basta o texto e o primeiro nome de uma cliente que autorize, e a página volta a aparecer sozinha. |
| **Rodar `SUPABASE_SERVICE_ROLE_KEY`** | Investigado a 9/08: nunca esteve no git, não é usada por código nenhum, não está em produção. Só rodar se houver suspeita de a chave ter sido vista em chat ou print — e nesse caso não parte nada. |
| Loja / checkout | `Product`, `Order` e `GiftCard` já existem no schema, sem interface. |
| Financeiro e Relatórios | Placeholders. O financeiro está bloqueado por decisões de IVA e comissões. |

## Coisas que já morderam neste projeto

- **`vercel deploy --prod` não move o endereço principal.** Depois de
  publicar, `vercel alias set <novo> ayaha-crm.vercel.app` e confirmar com
  `curl` ao endereço principal. Já aconteceu ficar dias num deploy antigo.
- **Migração antes do código que precisa dela.** Publicar primeiro o código
  partiu o login de clientes em produção.
- **Testar em modo escuro e a 375px.** O site esteve ilegível (preto sobre
  preto) para quem tem o telemóvel em modo escuro.
- **O `.claude/launch.json` que conta** é o do diretório de trabalho
  (`Desktop/chat`), não o da pasta do projeto.
- **A porta 3000 é obrigatória** em local: o retorno do Google OAuth está
  registado como `http://localhost:3000/api/auth/callback/google`.
- **Para correr um script avulso contra a base local** (verificar algo,
  semear um registo de teste), `npx tsx script.mts` sozinho não chega — o
  `DATABASE_URL` e afins vivem em `.env.local`/`.env`, que o Prisma só lê
  via `prisma.config.ts`. Um script fora desse caminho fica sem ligação.
  Funciona com `node --env-file=.env.local --env-file=.env --import tsx
  script.mts`, importando `prisma` de `src/server/db` (nunca instanciar
  `new PrismaClient()` à parte — Prisma 7 exige o driver adapter).
