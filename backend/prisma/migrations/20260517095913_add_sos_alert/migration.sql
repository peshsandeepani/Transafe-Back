-- CreateTable
CREATE TABLE "SOSAlert" (
    "id" SERIAL NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "senderName" TEXT NOT NULL,
    "senderRole" TEXT NOT NULL,
    "vehicleId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Active',
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SOSAlert_pkey" PRIMARY KEY ("id")
);
