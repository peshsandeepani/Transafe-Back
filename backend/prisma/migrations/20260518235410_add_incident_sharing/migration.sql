-- AlterTable
ALTER TABLE "RoadIncident" ADD COLUMN     "respondingDriverId" INTEGER,
ADD COLUMN     "respondingDriverName" TEXT,
ADD COLUMN     "sharedWith" JSONB NOT NULL DEFAULT '[]';
