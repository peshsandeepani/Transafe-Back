-- CreateEnum
CREATE TYPE "RideTripType" AS ENUM ('one_way', 'round_trip');

-- AlterEnum
ALTER TYPE "RideRequestStatus" ADD VALUE 'scheduled';

-- AlterEnum
ALTER TYPE "RideVehicleType" ADD VALUE 'bike';

-- AlterTable
ALTER TABLE "RideRequest" ADD COLUMN     "parentRideRequestId" INTEGER,
ADD COLUMN     "returnDateTime" TIMESTAMP(3),
ADD COLUMN     "tripType" "RideTripType" NOT NULL DEFAULT 'one_way';

-- AddForeignKey
ALTER TABLE "RideRequest" ADD CONSTRAINT "RideRequest_parentRideRequestId_fkey" FOREIGN KEY ("parentRideRequestId") REFERENCES "RideRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
