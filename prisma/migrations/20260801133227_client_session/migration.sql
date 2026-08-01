-- CreateTable
CREATE TABLE "ClientSession" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "clientAccountId" TEXT NOT NULL,
    "expires" TIMESTAMPTZ(3) NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ClientSession_sessionToken_key" ON "ClientSession"("sessionToken");

-- CreateIndex
CREATE INDEX "ClientSession_clientAccountId_idx" ON "ClientSession"("clientAccountId");

-- CreateIndex
CREATE INDEX "ClientSession_expires_idx" ON "ClientSession"("expires");

-- AddForeignKey
ALTER TABLE "ClientSession" ADD CONSTRAINT "ClientSession_clientAccountId_fkey" FOREIGN KEY ("clientAccountId") REFERENCES "ClientAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
