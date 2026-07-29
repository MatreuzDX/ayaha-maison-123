-- CreateEnum
CREATE TYPE "LashCurl" AS ENUM ('I', 'B', 'C', 'CC', 'D', 'DD', 'L', 'LC', 'LD', 'M');

-- CreateEnum
CREATE TYPE "EyeShape" AS ENUM ('ALMOND', 'ROUND', 'HOODED', 'DOWNTURNED', 'UPTURNED', 'DEEP_SET', 'PROTRUDING', 'MONOLID');

-- CreateEnum
CREATE TYPE "FaceShape" AS ENUM ('OVAL', 'ROUND', 'SQUARE', 'HEART', 'DIAMOND', 'OBLONG');

-- CreateEnum
CREATE TYPE "EyeSpacing" AS ENUM ('CLOSE_SET', 'AVERAGE', 'WIDE_SET');

-- CreateEnum
CREATE TYPE "EyeTilt" AS ENUM ('UPTURNED', 'NEUTRAL', 'DOWNTURNED');

-- CreateEnum
CREATE TYPE "Scale3" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "VisagismGoal" AS ENUM ('OPEN_EYE', 'ELONGATE', 'LIFT_OUTER', 'CORRECT_DOWNTURNED', 'CORRECT_CLOSE_SET', 'CORRECT_WIDE_SET', 'SENSUAL', 'NATURAL', 'GLAMOROUS');

-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "instagram" TEXT,
ADD COLUMN     "isFavorite" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isVip" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "photoUrl" TEXT,
ADD COLUMN     "profession" TEXT;

-- CreateTable
CREATE TABLE "LashProfile" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "eyeColor" TEXT,
    "eyeShape" "EyeShape",
    "eyeSpacing" "EyeSpacing",
    "eyeSize" "Scale3",
    "eyeTilt" "EyeTilt",
    "faceShape" "FaceShape",
    "skinTone" TEXT,
    "naturalColor" TEXT,
    "naturalThicknessMicrons" INTEGER,
    "naturalDensity" "Scale3",
    "naturalLengthMm" INTEGER,
    "naturalCurl" "LashCurl",
    "growthDirection" TEXT,
    "lashStrength" "Scale3",
    "eyeSensitivity" "Scale3",
    "wearsGlasses" BOOLEAN NOT NULL DEFAULT false,
    "goals" "VisagismGoal"[] DEFAULT ARRAY[]::"VisagismGoal"[],
    "visagismNotes" TEXT,
    "wishlist" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "lastReviewedAt" TIMESTAMPTZ(3),
    "lastReviewedById" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "LashProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mapping" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "appointmentId" TEXT,
    "name" TEXT NOT NULL,
    "curl" "LashCurl",
    "thicknessMicrons" INTEGER,
    "fanType" TEXT,
    "fansPerEye" INTEGER,
    "glueBrand" TEXT,
    "lashBrand" TEXT,
    "removerBrand" TEXT,
    "primerBrand" TEXT,
    "otherProducts" TEXT,
    "applicationMin" INTEGER,
    "retentionStars" INTEGER,
    "retentionNote" TEXT,
    "recommendedProducts" TEXT,
    "notes" TEXT,
    "sketchPath" TEXT,
    "appliedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "Mapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MappingZone" (
    "id" TEXT NOT NULL,
    "mappingId" TEXT NOT NULL,
    "eye" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "lengthMm" INTEGER NOT NULL,
    "curl" "LashCurl",
    "thicknessMicrons" INTEGER,

    CONSTRAINT "MappingZone_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LashProfile_clientId_key" ON "LashProfile"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "Mapping_appointmentId_key" ON "Mapping"("appointmentId");

-- CreateIndex
CREATE INDEX "Mapping_clientId_appliedAt_idx" ON "Mapping"("clientId", "appliedAt");

-- CreateIndex
CREATE INDEX "Mapping_unitId_appliedAt_idx" ON "Mapping"("unitId", "appliedAt");

-- CreateIndex
CREATE INDEX "MappingZone_mappingId_idx" ON "MappingZone"("mappingId");

-- CreateIndex
CREATE UNIQUE INDEX "MappingZone_mappingId_eye_position_key" ON "MappingZone"("mappingId", "eye", "position");

-- AddForeignKey
ALTER TABLE "LashProfile" ADD CONSTRAINT "LashProfile_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mapping" ADD CONSTRAINT "Mapping_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mapping" ADD CONSTRAINT "Mapping_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mapping" ADD CONSTRAINT "Mapping_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MappingZone" ADD CONSTRAINT "MappingZone_mappingId_fkey" FOREIGN KEY ("mappingId") REFERENCES "Mapping"("id") ON DELETE CASCADE ON UPDATE CASCADE;
