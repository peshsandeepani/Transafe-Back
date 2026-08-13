-- CreateTable
CREATE TABLE "AmbulanceTrip" (
    "id" SERIAL NOT NULL,
    "ambulanceId" TEXT NOT NULL,
    "driverName" TEXT NOT NULL,
    "startLatitude" DOUBLE PRECISION NOT NULL,
    "startLongitude" DOUBLE PRECISION NOT NULL,
    "endLatitude" DOUBLE PRECISION NOT NULL,
    "endLongitude" DOUBLE PRECISION NOT NULL,
    "currentLatitude" DOUBLE PRECISION,
    "currentLongitude" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'Active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AmbulanceTrip_pkey" PRIMARY KEY ("id")
);
