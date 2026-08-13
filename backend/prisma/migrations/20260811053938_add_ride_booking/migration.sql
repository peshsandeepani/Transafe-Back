-- CreateEnum
CREATE TYPE "RideVehicleType" AS ENUM ('tuk_tuk', 'car');

-- CreateEnum
CREATE TYPE "RideRequestStatus" AS ENUM ('requested', 'accepted', 'driver_en_route', 'picked_up', 'in_progress', 'completed', 'cancelled', 'expired');

-- CreateEnum
CREATE TYPE "RidePaymentMethod" AS ENUM ('cash', 'card');

-- CreateEnum
CREATE TYPE "RidePaymentStatus" AS ENUM ('pending', 'completed', 'failed', 'refunded');

-- CreateTable
CREATE TABLE "RideDriver" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "vehicleType" "RideVehicleType" NOT NULL,
    "vehicleMake" TEXT,
    "vehicleModel" TEXT,
    "vehicleNumber" TEXT,
    "licenseNumber" TEXT,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "lastKnownLatitude" DOUBLE PRECISION,
    "lastKnownLongitude" DOUBLE PRECISION,
    "lastSeenAt" TIMESTAMP(3),
    "ratingAverage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ratingCount" INTEGER NOT NULL DEFAULT 0,
    "earnings" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RideDriver_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RideRequest" (
    "id" SERIAL NOT NULL,
    "riderId" INTEGER NOT NULL,
    "pickupLatitude" DOUBLE PRECISION NOT NULL,
    "pickupLongitude" DOUBLE PRECISION NOT NULL,
    "pickupAddress" TEXT,
    "destinationLatitude" DOUBLE PRECISION NOT NULL,
    "destinationLongitude" DOUBLE PRECISION NOT NULL,
    "destinationAddress" TEXT,
    "vehicleType" "RideVehicleType" NOT NULL,
    "status" "RideRequestStatus" NOT NULL DEFAULT 'requested',
    "fareEstimate" DOUBLE PRECISION,
    "acceptedDriverId" INTEGER,
    "acceptedAt" TIMESTAMP(3),
    "driverEnRouteAt" TIMESTAMP(3),
    "pickedUpAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "finalFare" DOUBLE PRECISION,
    "paymentMethod" "RidePaymentMethod",
    "paymentStatus" "RidePaymentStatus" NOT NULL DEFAULT 'pending',
    "paymentProviderRef" TEXT,
    "paymentFailureReason" TEXT,
    "ratingGiven" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RideRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RideTrip" (
    "id" SERIAL NOT NULL,
    "rideRequestId" INTEGER NOT NULL,
    "riderId" INTEGER NOT NULL,
    "driverId" INTEGER NOT NULL,
    "pickupLatitude" DOUBLE PRECISION NOT NULL,
    "pickupLongitude" DOUBLE PRECISION NOT NULL,
    "pickupAddress" TEXT,
    "destinationLatitude" DOUBLE PRECISION NOT NULL,
    "destinationLongitude" DOUBLE PRECISION NOT NULL,
    "destinationAddress" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "routeDistanceKm" DOUBLE PRECISION,
    "estimatedFare" DOUBLE PRECISION,
    "finalFare" DOUBLE PRECISION,
    "paymentMethod" "RidePaymentMethod",
    "paymentStatus" "RidePaymentStatus" NOT NULL DEFAULT 'pending',
    "paymentProviderRef" TEXT,
    "paymentFailureReason" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "rating" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RideTrip_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RideDriver_userId_key" ON "RideDriver"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "RideTrip_rideRequestId_key" ON "RideTrip"("rideRequestId");

-- AddForeignKey
ALTER TABLE "RideDriver" ADD CONSTRAINT "RideDriver_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RideRequest" ADD CONSTRAINT "RideRequest_riderId_fkey" FOREIGN KEY ("riderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RideRequest" ADD CONSTRAINT "RideRequest_acceptedDriverId_fkey" FOREIGN KEY ("acceptedDriverId") REFERENCES "RideDriver"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RideTrip" ADD CONSTRAINT "RideTrip_rideRequestId_fkey" FOREIGN KEY ("rideRequestId") REFERENCES "RideRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RideTrip" ADD CONSTRAINT "RideTrip_riderId_fkey" FOREIGN KEY ("riderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RideTrip" ADD CONSTRAINT "RideTrip_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "RideDriver"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
