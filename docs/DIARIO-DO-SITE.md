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
