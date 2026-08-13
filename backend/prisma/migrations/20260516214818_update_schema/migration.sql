-- AlterTable
ALTER TABLE "Hospital" ADD COLUMN     "type" TEXT DEFAULT 'Public';

-- AlterTable
ALTER TABLE "RoadIncident" ADD COLUMN     "locationName" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "licenseNumber" TEXT,
ADD COLUMN     "phone" TEXT;

-- AlterTable
ALTER TABLE "Vehicle" ADD COLUMN     "hospitalId" INTEGER;
