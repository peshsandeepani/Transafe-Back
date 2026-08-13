/*
  Warnings:

  - A unique constraint covering the columns `[registrationNumber]` on the table `Hospital` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Hospital" ADD COLUMN     "importantInfo" TEXT,
ADD COLUMN     "registrationNumber" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Hospital_registrationNumber_key" ON "Hospital"("registrationNumber");
