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
- [ ] **SEO técnico do site público** — verificar sitemap.xml, robots.txt,
  meta descriptions por página, dados estruturados (JSON-LD já existe no
  layout — conferir se está completo e correto por página).
  Muitos "grandes sites" ganham tráfego orgânico por aqui, e é barato de
  fazer bem.
- [ ] **Verificar acessibilidade básica** — contraste, `alt` em imagens,
  navegação por teclado no site público e no portal da cliente.
- [ ] **Página 404 e páginas de erro personalizadas** — hoje usam o
  genérico do Next.js. Um site "grande" trata isto como parte da marca.
- [ ] **Performance de imagens** — conferir se `next/image` está a ser
  usado consistentemente nas páginas públicas (galeria, serviços).

## Decisões pendentes do Mateus (não avançar sem)

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
