-- AlterTable
ALTER TABLE "ClientAccount" ADD COLUMN     "approvedAt" TIMESTAMPTZ(3);

-- Contas criadas antes desta migração já tinham acesso completo — aprova-as
-- automaticamente. Só as próximas a registar-se é que ficam pendentes.
UPDATE "ClientAccount" SET "approvedAt" = "createdAt" WHERE "approvedAt" IS NULL;
