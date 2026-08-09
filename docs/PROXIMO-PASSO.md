# Próximo passo — prompt para colar

**Atualizado a 8 de agosto de 2026.**

Cola o bloco abaixo numa sessão nova do agente. Está escrito para ser lido
por um agente, não por uma pessoa — daí o tom seco.

---

## Prompt

```
Lê primeiro docs/stack-2026-08-08/README.md e AGENTS.md.

Constrói a AUTO-MARCAÇÃO: a cliente marca sozinha no site, sem passar
pelo WhatsApp.

O que já existe e NÃO deves reconstruir:
- Múltiplas profissionais (modelo Professional), já em uso na agenda.
- checkAvailability() e createAppointment() em
  src/server/services/appointment.service.ts — já calculam conflitos
  e tempo de deslocação.
- Portal da cliente em /conta, com marcações e cartão AYAHA Club.
- Contas de cliente com aprovação da equipa (ClientAccount.approvedAt).

O que falta construir:

1. requestAppointment(session, input) em src/server/client-booking.ts
   - NOVO ficheiro, separado de appointment.service.ts, pela mesma razão
     que client-auth.ts é separado de auth.ts: a cliente nunca deve poder
     acabar com poderes de equipa por acidente de código.
   - Recebe a sessão da cliente (getClientSession), não um Actor.
   - Só aceita se session.approved for true.
   - Reutiliza checkAvailability para não aceitar horários impossíveis.
   - Cria a marcação com status REQUESTED, nunca CONFIRMED — a equipa
     confirma depois na agenda.

2. Página /marcar (pública, exige sessão de cliente aprovada)
   - Passos por botões, não texto livre: serviço → profissional →
     dia → hora → confirmar.
   - Botões em vez de campo livre é deliberado: elimina a hipótese de
     interpretar mal uma data.
   - Só mostra horas realmente livres.

3. No fim: botão que abre o WhatsApp com o resumo já escrito
   (serviço, profissional, dia, hora). Mesmo padrão que já existe em
   src/app/(app)/app/agenda/page.tsx.

4. A marcação aparece em /conta ("Próximas marcações") e na agenda da
   equipa com o estado "Pedida".

Testes de integração obrigatórios:
- cliente não aprovada não consegue marcar
- não consegue marcar num horário ocupado
- não consegue marcar em nome de outra cliente
- a marcação criada fica em REQUESTED

Antes de dizer que está pronto: npm run typecheck && npm run lint &&
npm test && DEMO_MODE= npm run build. Depois deploy E confirma o alias
(vercel alias set <deploy> ayaha-crm.vercel.app) — sem isso o endereço
principal fica no deploy antigo.
```

---

## Já feito nesta sessão (8 de agosto)

Não precisas de pedir estas — estão em produção:

- **Palavra-passe mínima: 8 caracteres** (era 10).
- **Formulários deixaram de apagar tudo ao dar erro.** Errar a confirmação
  da palavra-passe já não obriga a reescrever nome, apelido, e-mail e
  telefone. No login, o e-mail também fica.
- **Gestão de acesso na ficha da cliente** (`/app/clientes/<id>`, cartão
  "Conta do portal"):
  - alterar o e-mail de acesso
  - definir uma palavra-passe nova (fecha as sessões abertas)
  - remover o acesso (tira palavra-passe e Google, fecha sessões)
  - aprovar contas pendentes

### Sobre ver a palavra-passe das clientes

Não é uma opção que faltou pôr — **é impossível**, e é assim que tem de
ser. Só fica guardado um *hash* Argon2id, que não se desfaz. Nem tu, nem
eu, nem quem tivesse acesso à base de dados consegue ler a palavra-passe
de uma cliente.

O que existe resolve o mesmo problema por outro caminho: a cliente diz que
não consegue entrar, combinam uma palavra-passe, tu escreve-la na ficha
dela, e ela passa a entrar com essa.

Uma nota honesta sobre isto: enquanto for a cliente a dizer-te a
palavra-passe (por telefone ou WhatsApp), tu ficas a saber a palavra-passe
dela — e ela provavelmente usa a mesma noutros sítios. Funciona para um
negócio pequeno, mas quando houver mais equipa vale a pena trocar por um
link de recuperação enviado por e-mail, em que ninguém da casa chega a ver
nada. Fica como sugestão, não como urgência.

## Ainda por fazer (fora a auto-marcação)

| O quê | Porquê importa |
|---|---|
| Depoimentos reais | Os que estão no site são inventados — trocar por reais antes de mostrar a clientes |
| Fotos verdadeiras | Ver `docs/stack-2026-08-08/README.md`; os tamanhos estão no guia de fotos |
| Recompensa "upgrade de técnica" | Com preço único de €30 não vale nada para a cliente — trocar nas Definições do CRM |
| Publicar o repositório no GitHub | O git é local, sem remote configurado |
| Rodar a SUPABASE_SERVICE_ROLE_KEY | **Investigado a 2026-08-09:** nunca esteve no git, não é usada por nenhum código, e não está nas variáveis de produção. O risco existe só se a chave tiver sido vista em chat ou print — nesse caso rodar no painel do Supabase, que é gratuito e não parte nada por não estar em uso. |
| Lembretes automáticos (48h/24h/2h) | Reduz faltas em 35–45% em quem já usa |
| Lembrete de retoque (2–3 semanas) | O hábito mais valioso do negócio, ainda por automatizar |
