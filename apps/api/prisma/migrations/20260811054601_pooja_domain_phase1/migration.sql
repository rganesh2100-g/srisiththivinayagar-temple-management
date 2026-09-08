/*
  Warnings:

  - You are about to drop the column `status` on the `pooja_bookings` table. All the data in the column will be lost.
  - Added the required column `duration` to the `poojas` table without a default value. This is not possible if the table is not empty.
  - Added the required column `god` to the `poojas` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "booking_messages" ADD COLUMN     "bookingDate" TIMESTAMP(3),
ADD COLUMN     "senderId" VARCHAR(36),
ADD COLUMN     "timeSlot" VARCHAR(100),
ALTER COLUMN "senderEmail" DROP NOT NULL;

-- AlterTable
ALTER TABLE "festivals" ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "pooja_bookings" DROP COLUMN "status",
ADD COLUMN     "feeAmount" DECIMAL(10,2),
ADD COLUMN     "receiptGeneratedAt" TIMESTAMP(3),
ADD COLUMN     "receiptId" VARCHAR(100),
ADD COLUMN     "receiptPdf" VARCHAR(500),
ADD COLUMN     "receiptSentAt" TIMESTAMP(3),
ADD COLUMN     "resendReceipt" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "bookingTime" SET DATA TYPE VARCHAR(50);

-- AlterTable
ALTER TABLE "poojas" ADD COLUMN     "availableDates" TEXT,
ADD COLUMN     "deity" VARCHAR(255),
ADD COLUMN     "duration" INTEGER NOT NULL,
ADD COLUMN     "god" VARCHAR(255) NOT NULL,
ADD COLUMN     "maxParticipants" INTEGER,
ADD COLUMN     "published" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "status" SET DEFAULT 'draft';

-- CreateIndex
CREATE INDEX "pooja_bookings_poojaId_poojaDate_timeSlot_idx" ON "pooja_bookings"("poojaId", "poojaDate", "timeSlot");

-- CreateIndex
CREATE INDEX "poojas_published_idx" ON "poojas"("published");
