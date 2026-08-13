-- AlterTable
ALTER TABLE "RoadIncident" ADD COLUMN     "respondingHospitalId" INTEGER,
ADD COLUMN     "respondingHospitalName" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "policeDepartmentId" INTEGER;

-- CreateTable
CREATE TABLE "PoliceDepartment" (
    "id" SERIAL NOT NULL,
    "stationName" TEXT NOT NULL,
    "stationCode" TEXT NOT NULL,
    "division" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "emergencyNumber" TEXT NOT NULL,
    "officerInCharge" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "district" TEXT NOT NULL,
    "province" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PoliceDepartment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PoliceDepartment_stationCode_key" ON "PoliceDepartment"("stationCode");

-- CreateIndex
CREATE UNIQUE INDEX "PoliceDepartment_email_key" ON "PoliceDepartment"("email");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_policeDepartmentId_fkey" FOREIGN KEY ("policeDepartmentId") REFERENCES "PoliceDepartment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
