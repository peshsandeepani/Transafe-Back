-- AlterTable
ALTER TABLE "SOSAlert" ADD COLUMN     "sharedWith" JSONB NOT NULL DEFAULT '[]';
