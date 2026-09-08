-- AlterTable
ALTER TABLE "users" ADD COLUMN     "pocketbaseId" VARCHAR(100),
ALTER COLUMN "name" DROP NOT NULL,
DROP COLUMN "approvalStatus",
ADD COLUMN     "approvalStatus" VARCHAR(50),
DROP COLUMN "accountType",
ADD COLUMN     "accountType" VARCHAR(50) NOT NULL DEFAULT 'Free Membership',
DROP COLUMN "fontSizePreference",
ADD COLUMN     "fontSizePreference" VARCHAR(50) NOT NULL DEFAULT 'normal';

-- DropEnum
DROP TYPE "AccountType";

-- DropEnum
DROP TYPE "ApprovalStatus";

-- DropEnum
DROP TYPE "FontSizePreference";

-- CreateIndex
CREATE UNIQUE INDEX "users_pocketbaseId_key" ON "users"("pocketbaseId");

-- CreateIndex
CREATE INDEX "users_approvalStatus_idx" ON "users"("approvalStatus");

-- CreateIndex
CREATE INDEX "users_accountType_idx" ON "users"("accountType");

-- Rebuild CHECK constraint for name (drop old NOT NULL-based, add NULL-safe version)
ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_name_min_length_check";
ALTER TABLE "users" ADD CONSTRAINT "users_name_nullable_or_min_length_check" CHECK (
    "name" IS NULL OR length("name") >= 2
);
