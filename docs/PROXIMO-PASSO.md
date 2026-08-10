# Próximo passo

**Atualizado a 9 de agosto de 2026.**

## Antes de tocar em código

Ler, por esta ordem:

1. `C:\Users\Mateus\Desktop\AYAHA-SKILLS\` — erros já cometidos e como
   evitá-los. Sobretudo `deploy-vercel-seguro` e `verificar-a-serio`.
2. `AGENTS.md` — resumo operacional do projeto.
3. `docs/stack-2026-08-08/README.md` — stack, ligações, armadilhas.

## Estado a 9 de agosto

Em produção, em `ayaha-crm.vercel.app`. **167 testes**, lint e build
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
No topo do painel: **pedidos de acesso** (aprovar/recusar) e **clientes na
altura do retoque** (mensagem de WhatsApp a um clique). Gestão de acesso
na ficha de cada cliente: alterar e-mail, definir palavra-passe nova,
remover acesso.

## O que falta

| O quê | Notas |
|---|---|
| **Publicar no GitHub** | O git é local, sem remote. Precisa do Mateus para autenticar — o terminal do agente não tem TTY para o Git Credential Manager. |
| **Lembretes 48h/24h/2h** antes do atendimento | Mesmo padrão do retoque: lista no CRM com envio a um clique. Reduz faltas em 35-45%. |
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
