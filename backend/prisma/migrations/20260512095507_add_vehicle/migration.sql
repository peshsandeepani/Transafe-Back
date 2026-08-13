-- CreateTable
CREATE TABLE "Vehicle" (
    "id" SERIAL NOT NULL,
    "vehicleNumber" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "driverName" TEXT NOT NULL,
    "gpsDeviceId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_vehicleNumber_key" ON "Vehicle"("vehicleNumber");
