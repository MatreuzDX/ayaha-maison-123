# Diário do site — o que mudou, quando e porquê

Registo de **tudo o que alguém consegue ver** no `ayaha-crm.vercel.app`:
texto, imagens, cores, preços, morada, serviços, páginas novas.

## Porque é que este ficheiro existe

O PC do Mateus foi formatado. O código sobreviveu, mas o **porquê** das
decisões vivia em conversas que se perderam. Um site sem o registo do porquê
volta a ser discutido de seis em seis meses, e as mesmas decisões voltam a ser
tomadas ao contrário.

Isto é a versão legível do histórico. O `git log` tem o detalhe técnico; aqui
fica o que interessa a quem toma decisões de negócio.

## Como se escreve aqui

Uma entrada por alteração visível, a mais recente **no topo** da secção do mês.
Registar **na mesma sessão em que se faz a alteração** — não no fim do dia,
não "depois".

```markdown
### DD/MM/AAAA — título curto do que mudou
**Commit:** `abc1234`
**O que mudou:** o que a cliente vê de diferente.
**Porquê:** a razão de negócio. Se veio de uma decisão do Mateus, dizer isso.
**Ficheiros/imagens:** o que foi tocado, imagens novas ou removidas.
**Por decidir:** o que ficou em aberto, se ficou.
```

Alterações internas que ninguém vê (refactor, testes, dependências) **não
entram aqui** — vão no commit e basta.

---

# 2026

## Setembro

### 13/09/2026 — Fotografias reais, login com Google de volta, contas de teste
**O que mudou:**
- **Fotografias de banco de imagens fora do site.** Havia 14 (Unsplash): no
  topo de Serviços uma pessoa num portátil, em Fidelidade e Depoimentos mãos a
  pintar unhas, na Galeria uma mulher a enrolar o cabelo. Tudo trocado pelas
  fotografias da AYAHA (`cilios-real-1/2`, `galeria/cliente-resultado-1`,
  `galeria/cliente-aplicacao-1`), incluindo as dos 7 serviços no banco.
- **Galeria "Os nossos resultados" só com trabalho real.** Saíram 6 fotografias
  de banco de imagens que estavam lá como se fossem resultados da AYAHA.
- **"Continuar com Google" de volta** no login e no registo, a pedido do Mateus
  (tinha saído a 02/08 porque o ecrã de consentimento do Google estava em modo
  de teste). O login passa a dizer quando o Google falha — antes voltava ao
  formulário sem explicar nada.
- **Contas para apresentar o site:** administradora `mateusdadiva16@gmail.com`
  (criada pelo seed no deploy) e uma cliente de teste já aprovada,
  `cliente.teste@exemplo.pt`. As senhas **não** estão aqui.
**Porquê:** o Mateus vai apresentar o site à cliente. Um site de cílios com
fotografias de unhas e cabelo, e uma galeria de "resultados" que não são dela,
não pode ir a essa reunião.
**Por fazer (só o Mateus):** no Google Cloud, autorizar o endereço de retorno
`https://ayaha-crm.vercel.app/api/auth/callback/google` e publicar o ecrã de
consentimento — sem isso o botão Google falha para quem não estiver na lista
de testadores. Mudar as senhas das contas depois de apresentar.

### 13/09/2026 — Banco novo no Supabase, ligado à Vercel; site no ar com banco
**O que mudou:** o site voltou a ter banco de dados. O Mateus mudou de ideias e
pediu Supabase outra vez, depois de apagar um projeto parado para caber no
limite de 2 projetos grátis.
**Onde vive:** Supabase `ayaha-crm` (`sjidqzuelheuhopapmff`, Frankfurt), na org
dele. A app liga pelo pooler de sessão com um utilizador próprio, `ayaha_app` —
as tabelas são dele e por isso **não** ficam expostas na API pública do
Supabase (verificado: 0 de 69 tabelas visíveis a `anon`/`authenticated`).
**Verificado no ar:** o build aplicou as migrações e correu o seed na própria
Vercel; 13 páginas no endereço principal sem ecrã de erro; nenhum
`banco indisponível` nos logs, ou seja, o site lê do banco e não do catálogo de
reserva.
**Dois problemas encontrados pelo caminho:**
- Um banco Supabase criado pelo painel da Vercel (`ayaha-crm-db`) ficou
  **suspenso** e, ligado ao projeto, **bloqueava todos os deploys** com
  `Resource provisioning failed`. Foi desligado do projeto (não apagado).
- `sslmode=require` no endereço deixa o Prisma aplicar as migrações mas **parte
  a app** (`self-signed certificate in certificate chain`). O endereço usa
  `sslmode=require&uselibpqcompat=true`.
**Por fazer:** conta de administração — o Mateus define `SEED_OWNER_EMAIL` e
`SEED_OWNER_PASSWORD` na Vercel e faz Redeploy.

### 12/09/2026 — Site em erro 500: o banco desapareceu; passa a viver na Vercel
**O que se viu:** a página inicial e a de serviços mostravam "Algo correu mal —
Não foi possível mostrar esta página" (código `2691905583`). Sobre, FAQ,
contacto e login abriam, porque não leem da base.
**Causa:** o site ligava ao Supabase `qyrsnefjlnesvecyenoi`, que deixou de
existir (`tenant/user ... not found` nos logs da Vercel, 22 ocorrências). Não
estava em nenhuma das contas Supabase ligadas. O código estava bem.
**O backup `db_cluster-05-08-2026` não serviu:** só tinha tabelas internas do
Supabase, nenhuma do site.
**Decisão do Mateus:** tudo só em **GitHub + Vercel**, sem Supabase. O banco
passa a ser criado no separador **Storage** da Vercel (Neon, gratuito). O
Supabase gratuito também já estava no limite de 2 projetos.
**O que mudou no código:**
- A Vercel aplica as migrações e o seed sozinha em cada deploy de produção
  (`prisma/preparar-banco.mjs`). Deixa de haver passos à mão.
- **Falha de segurança fechada:** o seed criava a Sofia e a Inês — profissionais
  inventadas — **com a palavra-passe da administradora**. Em produção seriam
  duas contas falsas com acesso ao CRM. Passam a existir só em demonstração.
- Sem `SEED_OWNER_PASSWORD`, o seed prepara o site mas não cria conta nenhuma,
  em vez de falhar o deploy.
**Dados:** os clientes e marcações que existissem no banco antigo perderam-se
com ele. O site recomeça do zero, como o Mateus já tinha pedido a 06/09.
**E para não dar erro de novo (mesmo dia, pedido do Mateus):**
- **O site público já não cai sem banco.** Início, serviços, cada serviço,
  fidelidade e sitemap mostram o catálogo base (7 serviços a €30 com textos e
  fotos, AYAHA Club) se o banco não responder. Login e CRM continuam a precisar
  do banco. O erro fica nos logs da Vercel com `banco indisponível`.
- **Uma só fonte para o catálogo:** `src/lib/catalog.ts`. O seed grava-o, o
  site mostra-o quando não há banco — nunca dizem coisas diferentes.
- **Serviços num banco novo já nascem com foto, destaques e descrição.** Antes
  isso vinha de `scripts/preencher-catalogo-publico.mjs`, que corria à mão e
  nunca chegava a um banco novo; foi apagado.
- **Sem `DATABASE_URL` o deploy segue** (com aviso) em vez de falhar. **Com o
  banco a não responder**, também segue — mas só se o deploy não trouxer
  migrações novas; se trouxer, para, para o código nunca ir à frente do banco.
  Exceção: se o servidor responder que o banco **não existe** (`tenant/user ...
  not found`, `database does not exist`), segue como se não houvesse banco —
  um banco apagado não tem schema que possa ficar atrás do código. Falhas que
  podem ser passageiras (tempo esgotado, ligação recusada) continuam a parar.
  Foi isto que deixou pôr o site de pé sem esperar pelo banco novo, sem apagar
  a variável à mão.
- **Supabase fora do código:** `.env.example`, comentários e guia de stack.
  O que ainda liga ao Supabase é só a variável `DATABASE_URL` na Vercel.

### 06/09/2026 — Arranque limpo: o seed deixa de inventar 20 clientes
**Commit:** `d69d2b4`
**O que mudou:** ao semear uma base vazia, o sistema criava sempre 20 clientes
fictícias (nomes inventados, telefones falsos, e-mails `@exemplo.pt`). Passa a
ser preciso pedi-las com `SEED_DEMO_CLIENTS=true`.
**Porquê:** para um negócio a arrancar a sério, 20 nomes inventados sujam
relatórios, marketing e fidelidade desde o primeiro dia, e mentem à equipa
sobre o tamanho do negócio. O Mateus pediu o site "como se fosse novo" — e
"novo" tem de querer dizer zero clientes.
**Verificado:** base zerada e semeada de novo dá **0 clientes** com a
configuração real toda de pé (7 serviços a €30, 5 zonas, AYAHA Club com 3
recompensas, 8 materiais, 3 contas de equipa). 181 testes a passar.
**Atenção:** isto foi feito e verificado na base **local**. A produção
continua com os dados que tinha.

### 06/09/2026 — Análise de saúde antes de sair da Vercel
**Sem alterações ao site.** Registo do que foi verificado — ver a secção
"Estado de saúde" no fim deste ficheiro.

## Agosto

### 16/08/2026 — Página de marketing com quatro segmentos de clientes
**Commit:** `d874077` · **Publicado em produção no mesmo dia**
**O que mudou:** página de marketing a funcionar, dividida por quatro segmentos
de cliente.

### 16/08/2026 — Galeria só com fotografia
**Commit:** `12b878a`
**O que mudou:** o vídeo de cliente saiu da galeria. Ficou só fotografia.
**Imagens:** `public/videos/cliente-resultado-1.mp4` deixou de ser usado no site
(o ficheiro continua no repositório).

### 16/08/2026 — Páginas de 404 e de erro com a cara da marca
**Commit:** `2b25d21`
**O que mudou:** quem cai numa página que não existe passa a ver algo da AYAHA,
não o ecrã cinzento do Next.js.

### 16/08/2026 — Dourado-escuro legível
**Commit:** `205ccd1`
**O que mudou:** o tom de dourado passou a ter contraste 4.5:1 sobre todos os
fundos claros.
**Porquê:** acessibilidade — o dourado anterior era ilegível para muita gente.

### 16/08/2026 — `sitemap.xml` e `robots.txt`
**Commit:** `f3fac3b`
**O que mudou:** o Google passa a saber que páginas existem e quais indexar.

### 16/08/2026 — Novo modelo de atendimento: espaço em Benfica + domicílio
**Commit:** `f55c2cc` · ⚠️ **mudança de modelo de negócio**
**O que mudou:** o negócio deixou de ser *exclusivamente ao domicílio*. Passou a
haver espaço físico na **R. Gonçalves Viana 6A, 1500-134 Lisboa**, partilhado
com o **Studio Izabela Vieira** (salão de unhas já estabelecido). O domicílio
continua, como segunda opção à escolha da cliente.
**Onde se vê:** página inicial, sobre, serviços, contacto, FAQ, rodapé, e os
dados estruturados `LocalBusiness` que o Google lê (com `streetAddress`,
`postalCode` e `hasMap` — é o que faz aparecer certo no Maps).
**Porquê a morada demorou:** foi pedida ao Mateus e confirmada antes de entrar
no código. Havia um alfinete sem nome no Maps dele, noutra zona da cidade, e não
havia como saber se era o mesmo sítio. **Não se inventa uma morada.**
**Por decidir:** o motor de deslocação ainda assume sempre viagem até à cliente.
Uma marcação no espaço não devia ter taxa nem tempo de deslocação — mas isso
muda o preço? muda a duração do slot? É decisão de negócio, está em
`docs/TRABALHO-AUTONOMO.md`.

### 16/08/2026 — Lembretes de atendimento no CRM (48h/24h/2h)
**Commit:** interno ao CRM, não ao site público.

### 15/08/2026 — Instagram corrigido, redes inexistentes removidas
**Commit:** `(ver git log)`
**O que mudou:** o link do Instagram estava errado e havia ícones de redes que
não existem.
**Atenção:** o Instagram é **`@maisonayaha`** — **não** é `ayahamaison`.

### 09/08/2026 — Site ilegível em telemóveis com modo escuro
**Commit:** `6625f27`
**O que mudou:** o site público ficava ilegível em telemóveis com modo escuro
ligado. Corrigido.
**Lição:** verificar sempre no telemóvel **e** em modo escuro.

### 09/08/2026 — Depoimentos inventados removidos
**Commit:** `0ca0455` · ⚠️ **regra permanente**
**O que mudou:** saíram do site depoimentos que não eram de clientes reais.
**Porquê:** conteúdo falso num negócio de serviço pessoal é mentira ao cliente.
**Regra:** só entram depoimentos reais, com autorização. Enquanto não houver,
a página mostra um estado vazio honesto. Ver
`AYAHA-SKILLS/honestidade-no-produto`.

### 09/08/2026 — Portal da Cliente
**Commit:** `(ver git log)`
**O que mudou:** navegação, painel, histórico, benefícios e segurança na zona
autenticada da cliente.

### 08/08/2026 — Auto-marcação: a cliente marca sozinha
**Commit:** `c62bb7c`
**O que mudou:** a cliente passa a conseguir marcar pelo site, sem WhatsApp.

### 08/08/2026 — Trabalho real na galeria
**Commit:** `7fb1b27`
**Imagens:** entraram duas fotografias e um vídeo de trabalho real (o vídeo
saiu depois, a 16/08).

### 02/08/2026 — Páginas do site que davam 404
**Commit:** `0ab4f07`
**O que mudou:** Sobre, Serviços, Galeria, Depoimentos, FAQ e Contacto passaram
a existir. Até aí davam erro.

### 02/08/2026 — Login com Google entrou e saiu
**Commits:** `a4ecb36` (entrou) → `be3c8b0` (saiu)
**O que mudou:** o login com Google foi adicionado e removido do ecrã no mesmo
dia. Ficou só e-mail/palavra-passe.
**Nota:** o OAuth do Google Cloud continua configurado, com retorno em
`http://localhost:3000/api/auth/callback/google`.

### 02/08/2026 — Confirmação de marcação por WhatsApp
**Commit:** `bc0eb8c`
**O que mudou:** confirmação por WhatsApp e chat de ajuda. WhatsApp é o canal
principal: **+351 933 055 502**.

### 01/08/2026 — O site público passou a ser a raiz
**Commits:** `(Etapas 1 a 3 da unificação)`
**O que mudou:** site público, CRM da equipa e portal da cliente passaram a
viver numa só aplicação. A página inicial passou a mostrar dados reais.
**Cópia de segurança:** branch `backup/pre-unificacao-2026-08-01` e pasta
`Desktop\BACKUP-AYAHA-2026-08-01`.

### 31/07/2026 — Dados de demonstração limpos
**Commit:** `(ver git log)`
**O que mudou:** saíram os dados inventados. O painel arranca do zero, como um
negócio novo. Corrigido também o esgotamento de ligações à base em produção.

### 29/07/2026 — Início
**Commit:** `(primeiro commit)`
**O que mudou:** fundações do CRM — clientes, catálogo e agenda.

---

## Antes disto

Havia um site anterior (`Desktop\Site que o Cloud Code gerou pra mim`, Next 14,
com os dados num `db.json`). Foi **substituído** por este e nunca deve ir para
o ar. O que estava mal está escrito em
`Desktop\AYAHA MAISON - Auditoria de Producao.md`.

---

## Onde está o resto

| Onde | O quê |
|---|---|
| `docs/ESPECIFICACAO.md` | O raciocínio de negócio, escrito antes do código. 2300 linhas — abre-se a secção, não o ficheiro. |
| `docs/adr/README.md` | Decisões de arquitetura e o porquê. |
| `docs/PROXIMO-PASSO.md` | O que falta fazer a seguir. |
| `docs/TRABALHO-AUTONOMO.md` | Decisões que estão à espera do Mateus. |
| `docs/DEPLOY.md` | Como publicar. |
| `git log` | O detalhe técnico de cada alteração. As mensagens são longas de propósito. |
| `Desktop\CONTEXTO-TRABALHO\` | Inventário de todos os projetos, contas e serviços. |
| `Desktop\AYAHA-SKILLS\` | Lições que já custaram tempo. |

---

# Estado de saúde — verificado a 06/09/2026

| Verificação | Resultado |
|---|---|
| `npm run typecheck` | ✅ limpo |
| `npm run lint` | ✅ limpo |
| `npm test` | ✅ **181 testes, 14 ficheiros, 0 falhas** |
| `npm run build:check` | ✅ compila |
| Site em produção | ✅ HTTP 200, base de dados a responder |
| Rotas protegidas sem sessão | ✅ 307 para `/login`, sem fuga de dados |

## O que encontrei e ainda não está resolvido

| # | O quê | Gravidade |
|---|---|---|
| 1 | **10 imagens do site são stock do Unsplash**, carregadas do servidor deles em cada visita. Num negócio de imagem, o site mostra olhos que não são de clientes da AYAHA. Se o Unsplash falhar ou mudar as regras, o site fica sem imagens. | 🔴 alta |
| 2 | ~~**`engines` não está definido** no `package.json`~~ — **resolvido a 12/09/2026:** `"engines": { "node": "24.x" }`, igual à Vercel. | ✅ |
| 3 | **Não há rotas `/api/cron/*`**, embora a especificação (§ do `CRON_SECRET`) as preveja. Os lembretes de 48h/24h/2h **aparecem no CRM**, mas **nada é enviado automaticamente** à cliente. | 🟠 média |
| 4 | **`output: "standalone"` não está no `next.config.ts`.** Não é preciso na Vercel; é o que torna o auto-alojamento simples (imagem Docker pequena). | 🟡 baixa |
| 5 | Existe um projeto Supabase `INACTIVE` (`iqvkgazpyouozhwgdick`) que **não** é o da produção. Convém perceber se é lixo. | 🟡 baixa |
| 6 | ~~`npm run db:reset` usa `--skip-seed`~~ — **errado, corrigido a 12/09/2026.** O script é só `prisma migrate reset` e funciona; o `--skip-seed` (que não existe no Prisma 7) fui eu que o tentei à mão. | — |

## Sair da Vercel — o que está a favor

**Não há nenhuma dependência da Vercel.** Zero pacotes `@vercel/*`, zero APIs
próprias da plataforma. O `vercel.json` só define o comando de build, o
framework e a região (`fra1`, Frankfurt).

O que o novo alojamento precisa de ter:

- **Node a correr `next start`** — todas as páginas são dinâmicas
  (`ƒ server-rendered on demand`). **Não serve alojamento estático**, nem
  cPanel simples: tem de ser VPS, Docker, Railway, Fly.io, Render ou parecido.
- **Postgres** acessível (hoje Supabase).
- **As 21 variáveis de ambiente** listadas em `.env.example`.
- **Um agendador** (cron do sistema) se os lembretes automáticos passarem a
  existir — ver ponto 3.
