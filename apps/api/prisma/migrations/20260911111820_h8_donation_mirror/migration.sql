-- AlterEnum
ALTER TYPE "PaymentApprovalStatus" ADD VALUE 'completed';

-- AlterTable
ALTER TABLE "donations" ADD COLUMN     "notes" TEXT,
ADD COLUMN     "receiptId" VARCHAR(100),
ADD COLUMN     "receiptSentAt" TIMESTAMP(3),
ADD COLUMN     "resendReceipt" BOOLEAN NOT NULL DEFAULT false;
