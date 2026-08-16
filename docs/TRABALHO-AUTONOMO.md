# Registo de trabalho autónomo

O Mateus pediu, a 15/08/2026, para eu continuar a melhorar o projeto
sozinho enquanto ele está fora — analisar o site e o CRM, pesquisar o que
existe em sites e CRMs grandes que falte aqui, olhar para concorrentes,
trazer melhorias reais para dentro do código, e avisar de vez em quando.

Este ficheiro é a memória entre sessões: cada sessão de trabalho começa por
ler isto, para não repetir pesquisa nem perder o fio. Sempre que um bloco
de trabalho fecha (implementado, testado, commitado), atualiza-se aqui.

## Regras que cada sessão segue

1. **Só entra o que já foi verificado.** `npm run typecheck`, `npm run
   lint`, `npm test` e `npm run build:check` têm de passar antes de
   qualquer commit. Nenhuma exceção.
2. **Um commit por melhoria concluída**, com mensagem que explica o
   porquê, não só o quê — no estilo já usado no resto do histórico deste
   repositório.
3. **Nada de dados inventados.** Preços, testemunhos, estatísticas de
   negócio — só entram se vierem de uma fonte real (o próprio código, o
   `docs/ESPECIFICACAO.md`, ou algo que o Mateus tenha confirmado).
4. **Reaproveitar padrões existentes**, não inventar arquitetura nova. Os
   painéis de pedidos/retoque/lembretes no `/app` são o modelo para
   "lista de trabalho com ação de um clique" — a maior parte de features
   pequenas encaixa nesse molde.
5. **Nada de ações irreversíveis ou visíveis para fora sem autorização**:
   sem `git push`, sem deploy para produção, sem mexer em contas externas
   (Vercel, Supabase, Google Cloud), sem enviar mensagens a clientes reais.
   Tudo fica local e commitado, à espera de revisão.
6. **Se travar numa decisão que só o Mateus pode tomar** (preço,
   confirmação de facto de negócio, escolha entre duas direções de
   produto), registar aqui em "Decisões pendentes" e seguir para outra
   coisa — não ficar parado à espera.
7. **Ler `AYAHA-SKILLS/` antes de mexer** se a sessão for a primeira do
   dia — os erros já pagos (armadilha do alias do Vercel, ordem de
   migração, etc.) não se repetem.

## O que já foi feito nesta rotina

### 15-16/08/2026
- Corrigido o link do Instagram no rodapé do site (apontava para o
  perfil errado) e removidos Facebook/TikTok, que não existem.
- Implementados os **lembretes de atendimento** (48h/24h/2h antes) no
  painel do CRM — mesmo padrão dos retoques, 7 testes novos, verificado
  ao vivo. 174 testes no total.
- Montada esta rotina de trabalho autónomo.
- **Mudança de modelo de negócio:** deixou de ser exclusivamente ao
  domicílio. Novo espaço físico em Benfica (partilhado com o Studio
  Izabela Vieira, R. Gonçalves Viana 6A, 1500-134 Lisboa), confirmado
  pelo Mateus. Site inteiro ajustado — `SITE.studio` em site-config.ts é
  a fonte da morada. Ver "Decisões pendentes" abaixo para o que ficou por
  fazer no motor de agenda.
- **SEO técnico:** faltavam `sitemap.xml` e `robots.txt` — não existia
  nenhum dos dois. Criados `src/app/sitemap.ts` (8 páginas fixas + os 7
  serviços, lidos ao vivo do CRM) e `src/app/robots.ts` (bloqueia
  `/app`, `/conta`, `/api`). As páginas de serviço já tinham
  `generateMetadata` próprio — isso, ao contrário do que pareceu numa
  primeira leitura por grep, já estava bem feito.
- **Acessibilidade:** `alt` em imagens ✓ (já estava), foco por teclado ✓
  (regra `:focus-visible` global já existia), contraste ✗ → corrigido: o
  `--gold-deep` dava 3.0:1 sobre marfim em todo o texto pequeno dourado;
  escurecido para `#866d3e` (4.5:1 medido no pior fundo). Fundos escuros
  intocados.
- **Páginas de erro:** não existia nenhuma — o site mostrava o ecrã
  genérico do Next. Criadas quatro: `app/not-found.tsx` (endereços
  inexistentes), `(site)/not-found.tsx` (serviço desativado, já com
  menu), `(site)/error.tsx` (erro em execução, mostra o `digest` mas
  nunca a mensagem técnica) e `app/global-error.tsx` (falha no layout de
  raiz, com estilos à mão por não haver CSS nessa altura). Duas
  armadilhas descobertas pelo caminho ficaram registadas em
  `PROXIMO-PASSO.md`: `npm run build` falha em local por causa da guarda
  do `DEMO_MODE`, e o `error.tsx` só se consegue testar num build de
  produção com browser real.

## Fila de trabalho (por ordem de valor, a rever a cada sessão)

Feita a partir de: análise do código existente, o que falta face à
especificação (`docs/ESPECIFICACAO.md`), e pesquisa sobre o que sites e
CRMs deste setor costumam ter.

- [ ] **Estudo de concorrência local** — Day Lashes (1,3 mil seguidores,
  ficha no Google, Linktree) e outros estúdios de Lisboa: o que têm no
  site/perfil que a AYAHA não tem. Ponto de partida já feito numa
  conversa anterior; falta aprofundar e trazer conclusões concretas.
- [ ] **Loja/checkout** — `Product`, `Order`, `GiftCard` já existem no
  schema, sem interface nenhuma. Avaliar se vale a pena uma versão mínima
  (gift cards, já que têm modelo pronto) antes de produtos físicos.
- [ ] **Performance de imagens** — conferir se `next/image` está a ser
  usado consistentemente nas páginas públicas (galeria, serviços).

## Decisões pendentes do Mateus (não avançar sem)

- **Marcação no espaço vs. a domicílio, no motor de agenda.** Desde
  16/08/2026 há um espaço físico em Benfica, mas
  `appointment.service.ts` ainda assume sempre deslocação até à cliente
  — toda marcação calcula `departAt`, tempo e taxa de viagem. Uma
  marcação no espaço não devia ter nada disso, mas mexer exige decidir:
  o preço muda (sem taxa de deslocação)? A duração do slot muda (sem
  tempo de chegada/saída)? Como escolhe a cliente entre as duas no
  `/conta/marcar`? Não avançar nisto sem o Mateus confirmar.
- **Recompensa "upgrade de técnica"** não vale nada com preço único de
  €30 — sugerido substituir por "6.º atendimento grátis". Muda-se nas
  Definições do CRM, mas é decisão da fundadora.
- **Push para o GitHub** — precisa dele para autenticar.

## Cadência das notificações

Não é de duas em duas horas — 84 notificações numa semana seria mais
ruído do que ajuda, e cada sessão de trabalho tem um custo real. A rotina
está armada para correr **duas vezes por dia** durante os próximos dias:
uma sessão da manhã, uma da tarde. Cada uma fecha com um resumo do que
mudou. Se preferires outro ritmo, é só dizer — muda-se num sítio só.
