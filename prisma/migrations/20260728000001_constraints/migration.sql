-- Constraints que o Prisma não sabe exprimir.
-- Ver especificação secção 6.3.
--
-- Estas são as regras que tornam impossíveis, ao nível da base de dados, os
-- erros que mais custam a este negócio. A camada de serviço também as valida,
-- mas a base é a última linha de defesa: apanha bugs, condições de corrida e
-- escritas feitas fora da aplicação.

CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ─────────────────────────────────────────────────────────────
-- 1. Nenhuma profissional em dois sítios ao mesmo tempo
-- ─────────────────────────────────────────────────────────────
-- O intervalo vai de `departAt` (hora de sair de casa/do atendimento anterior)
-- até `endAt`. Usar `startAt` não chegaria: duas marcações às 10:00 em Benfica
-- e às 11:45 em Cascais não se sobrepõem no papel, mas são fisicamente
-- impossíveis. É `departAt` que traduz isso para a base de dados.
ALTER TABLE "Appointment"
  ADD CONSTRAINT appointment_no_overlap
  EXCLUDE USING gist (
    "professionalId" WITH =,
    tstzrange("departAt", "endAt", '[)') WITH &&
  )
  WHERE ("deletedAt" IS NULL AND "status" NOT IN ('CANCELLED', 'NO_SHOW'));

-- Um intervalo tem de acabar depois de começar, e a partida nunca é depois do início.
ALTER TABLE "Appointment"
  ADD CONSTRAINT appointment_time_sane
  CHECK ("endAt" > "startAt" AND "departAt" <= "startAt");

-- ─────────────────────────────────────────────────────────────
-- 2. Stock nunca negativo
-- ─────────────────────────────────────────────────────────────
ALTER TABLE "Material"
  ADD CONSTRAINT material_qty_nonneg
  CHECK ("quantityOnHand" >= 0);

-- ─────────────────────────────────────────────────────────────
-- 3. Gift card: saldo entre zero e o valor emitido
-- ─────────────────────────────────────────────────────────────
ALTER TABLE "GiftCard"
  ADD CONSTRAINT giftcard_balance_valid
  CHECK ("balanceCents" >= 0 AND "balanceCents" <= "initialCents");

-- ─────────────────────────────────────────────────────────────
-- 4. Fidelidade: um só cartão ativo por cliente
-- ─────────────────────────────────────────────────────────────
-- Índice único parcial — o Prisma não exprime o `WHERE`.
CREATE UNIQUE INDEX loyalty_one_active_card
  ON "LoyaltyCard" ("clientId")
  WHERE "isActive" = true;

-- Nunca mais carimbos do que os exigidos.
ALTER TABLE "LoyaltyCard"
  ADD CONSTRAINT loyalty_stamps_within_bounds
  CHECK ("stampsCount" >= 0 AND "stampsCount" <= "stampsRequired");

-- ─────────────────────────────────────────────────────────────
-- 5. Faturas: número imutável depois de emitida
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION prevent_invoice_number_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD."status" <> 'DRAFT' AND NEW."number" IS DISTINCT FROM OLD."number" THEN
    RAISE EXCEPTION 'O número da fatura não pode ser alterado depois de emitida (%).', OLD."number";
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_invoice_number_immutable
  BEFORE UPDATE ON "Invoice"
  FOR EACH ROW EXECUTE FUNCTION prevent_invoice_number_change();

-- Valores de fatura nunca negativos.
ALTER TABLE "Invoice"
  ADD CONSTRAINT invoice_amounts_nonneg
  CHECK (
    "subtotalCents" >= 0 AND "discountCents" >= 0 AND
    "travelFeeCents" >= 0 AND "totalCents" >= 0
  );

-- ─────────────────────────────────────────────────────────────
-- 6. AuditLog é append-only
-- ─────────────────────────────────────────────────────────────
-- Um registo de auditoria que se possa alterar não é um registo de auditoria.
CREATE OR REPLACE FUNCTION prevent_audit_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'AuditLog é imutável: % não é permitido.', TG_OP;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_audit_no_update
  BEFORE UPDATE ON "AuditLog"
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_mutation();

CREATE TRIGGER trg_audit_no_delete
  BEFORE DELETE ON "AuditLog"
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_mutation();

-- ─────────────────────────────────────────────────────────────
-- 7. Horários de trabalho coerentes
-- ─────────────────────────────────────────────────────────────
ALTER TABLE "WorkingHour"
  ADD CONSTRAINT workinghour_range_valid
  CHECK (
    "weekday" BETWEEN 0 AND 6 AND
    "startMin" >= 0 AND "endMin" <= 1440 AND
    "endMin" > "startMin"
  );

ALTER TABLE "TimeOff"
  ADD CONSTRAINT timeoff_range_valid
  CHECK ("endAt" > "startAt");

-- ─────────────────────────────────────────────────────────────
-- 8. Serviços e preços
-- ─────────────────────────────────────────────────────────────
ALTER TABLE "Service"
  ADD CONSTRAINT service_values_sane
  CHECK (
    "durationMin" > 0 AND "setupMin" >= 0 AND "teardownMin" >= 0 AND
    "priceCents" >= 0 AND "vatBps" >= 0
  );

-- ─────────────────────────────────────────────────────────────
-- 9. Comissões
-- ─────────────────────────────────────────────────────────────
ALTER TABLE "Commission"
  ADD CONSTRAINT commission_period_valid
  CHECK ("periodMonth" BETWEEN 1 AND 12 AND "periodYear" BETWEEN 2020 AND 2100);

ALTER TABLE "Payout"
  ADD CONSTRAINT payout_period_valid
  CHECK ("periodMonth" BETWEEN 1 AND 12 AND "periodYear" BETWEEN 2020 AND 2100);
