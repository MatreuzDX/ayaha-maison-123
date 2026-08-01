-- AlterTable
ALTER TABLE "Service" ADD COLUMN     "displayCategory" TEXT,
ADD COLUMN     "highlights" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "imageUrl" TEXT,
ADD COLUMN     "longDescription" TEXT[] DEFAULT ARRAY[]::TEXT[];
