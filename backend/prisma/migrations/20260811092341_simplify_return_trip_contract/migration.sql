-- AlterTable
ALTER TABLE "RideRequest" ADD COLUMN     "returnDropAddress" TEXT,
ADD COLUMN     "returnDropLatitude" DOUBLE PRECISION,
ADD COLUMN     "returnDropLongitude" DOUBLE PRECISION,
ADD COLUMN     "stopAddress" TEXT,
ADD COLUMN     "stopLatitude" DOUBLE PRECISION,
ADD COLUMN     "stopLongitude" DOUBLE PRECISION;
