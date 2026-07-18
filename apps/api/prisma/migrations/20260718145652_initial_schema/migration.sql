-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('user', 'admin');

-- CreateEnum
CREATE TYPE "MembershipTier" AS ENUM ('free', 'premium');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('free', 'premium', 'admin');

-- CreateEnum
CREATE TYPE "PremiumStatus" AS ENUM ('Active', 'Inactive', 'Pending');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('pending_approval', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('free_member', 'premium_member', 'admin');

-- CreateEnum
CREATE TYPE "PreferredLanguage" AS ENUM ('Tamil', 'English', 'Deutsch');

-- CreateEnum
CREATE TYPE "FontSizePreference" AS ENUM ('small', 'normal', 'large');

-- CreateEnum
CREATE TYPE "NotificationPreference" AS ENUM ('all', 'important', 'none');

-- CreateEnum
CREATE TYPE "PoojaCategory" AS ENUM ('daily', 'special', 'festival', 'life_cycle', 'homam', 'archana');

-- CreateEnum
CREATE TYPE "PoojaStatus" AS ENUM ('active', 'inactive', 'archived', 'draft');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('pending', 'approved', 'rejected', 'confirmed', 'cancelled', 'completed');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('pending', 'completed', 'failed', 'refunded');

-- CreateEnum
CREATE TYPE "SubscriptionPlanType" AS ENUM ('premium');

-- CreateEnum
CREATE TYPE "SubscriptionRecordStatus" AS ENUM ('pending', 'active', 'rejected');

-- CreateEnum
CREATE TYPE "RenewalType" AS ENUM ('auto', 'manual');

-- CreateEnum
CREATE TYPE "PaymentApprovalStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "ApprovalLogAction" AS ENUM ('approved', 'rejected', 'restored', 'deleted');

-- CreateEnum
CREATE TYPE "FestivalStatus" AS ENUM ('active', 'archived');

-- CreateEnum
CREATE TYPE "BookingMessageSenderType" AS ENUM ('admin', 'user');

-- CreateEnum
CREATE TYPE "SubscriptionReminderStatus" AS ENUM ('pending', 'sent', 'failed');

-- CreateEnum
CREATE TYPE "AiMessageRole" AS ENUM ('user', 'assistant');

-- CreateEnum
CREATE TYPE "PageAccessLevel" AS ENUM ('view', 'edit', 'admin');

-- CreateEnum
CREATE TYPE "SubscriptionType" AS ENUM ('Monthly', 'Yearly');

-- CreateEnum
CREATE TYPE "VolunteerStatus" AS ENUM ('completed', 'pending');

-- CreateTable
CREATE TABLE "users" (
    "id" VARCHAR(36) NOT NULL,
    "email" VARCHAR(320) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "avatar" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "emailVisibility" BOOLEAN NOT NULL DEFAULT false,
    "tokenKey" VARCHAR(255),
    "lastResetSentAt" TIMESTAMP(3),
    "lastVerificationSentAt" TIMESTAMP(3),
    "role" "UserRole" NOT NULL DEFAULT 'user',
    "membershipTier" "MembershipTier" NOT NULL DEFAULT 'free',
    "membershipType" "MembershipTier" NOT NULL DEFAULT 'free',
    "subscriptionStatus" "SubscriptionStatus" NOT NULL DEFAULT 'free',
    "premiumStatus" "PremiumStatus" NOT NULL DEFAULT 'Inactive',
    "approvalStatus" "ApprovalStatus" NOT NULL DEFAULT 'pending_approval',
    "accountType" "AccountType" NOT NULL DEFAULT 'free_member',
    "phone" VARCHAR(15),
    "address" VARCHAR(200),
    "city" VARCHAR(50),
    "state" VARCHAR(50),
    "pincode" VARCHAR(6),
    "preferredLanguage" "PreferredLanguage",
    "fontSizePreference" "FontSizePreference" NOT NULL DEFAULT 'normal',
    "joinDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "subscriptionExpiryDate" TIMESTAMP(3),
    "lastRenewalDate" TIMESTAMP(3),
    "isBlocked" BOOLEAN NOT NULL DEFAULT false,
    "blockedAt" TIMESTAMP(3),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account_types" (
    "id" VARCHAR(36) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "permissions" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense_categories" (
    "id" VARCHAR(36) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "createdBy" VARCHAR(255),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expense_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "photo_categories" (
    "id" VARCHAR(36) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "createdBy" VARCHAR(255),
    "defaultExpanded" BOOLEAN NOT NULL DEFAULT false,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "photo_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "festivals" (
    "id" VARCHAR(36) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "date" DATE,
    "status" "FestivalStatus",
    "image" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "festivals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_accounts" (
    "id" VARCHAR(36) NOT NULL,
    "accountName" VARCHAR(255) NOT NULL,
    "bankName" VARCHAR(255) NOT NULL,
    "accountNumber" VARCHAR(50) NOT NULL,
    "email" VARCHAR(320) NOT NULL,
    "qrCode" VARCHAR(500),
    "iban" VARCHAR(50),
    "paymentLink" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_account_config" (
    "id" VARCHAR(36) NOT NULL,
    "bankName" VARCHAR(255) NOT NULL,
    "accountHolderName" VARCHAR(255) NOT NULL,
    "accountNumber" VARCHAR(50) NOT NULL,
    "iban" VARCHAR(50),
    "contactEmail" VARCHAR(320) NOT NULL,
    "directPaymentLink" VARCHAR(500),
    "qrCodeImage" VARCHAR(500),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bank_account_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_inquiries" (
    "id" VARCHAR(36) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(320) NOT NULL,
    "phone" VARCHAR(15),
    "subject" VARCHAR(255) NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contact_inquiries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "poojas" (
    "id" VARCHAR(36) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "category" "PoojaCategory" NOT NULL DEFAULT 'daily',
    "donationAmount" DECIMAL(10,2) NOT NULL,
    "price" DECIMAL(10,2),
    "availabilityType" VARCHAR(50),
    "dates" JSONB,
    "days" JSONB,
    "specificDates" JSONB,
    "specificDays" JSONB,
    "timeSlots" JSONB,
    "status" "PoojaStatus" NOT NULL DEFAULT 'active',
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" TIMESTAMP(3),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "festivalId" VARCHAR(36),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "poojas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pooja_bookings" (
    "id" VARCHAR(36) NOT NULL,
    "userId" VARCHAR(36) NOT NULL,
    "poojaId" VARCHAR(36) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(320) NOT NULL,
    "userContact" VARCHAR(15),
    "phone" VARCHAR(15),
    "bookingDate" TIMESTAMP(3),
    "poojaDate" TIMESTAMP(3),
    "timeSlot" VARCHAR(50),
    "selectedDate" VARCHAR(50),
    "selectedTimeSlot" VARCHAR(50),
    "donationAmount" DECIMAL(10,2) NOT NULL,
    "bookingStatus" "BookingStatus" NOT NULL DEFAULT 'pending',
    "paymentStatus" "PaymentStatus",
    "status" VARCHAR(50),
    "receiptNumber" VARCHAR(50),
    "transactionId" VARCHAR(100),
    "notes" TEXT,
    "poojaName" VARCHAR(255),
    "bookingTime" TIMESTAMP(3),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pooja_bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_messages" (
    "id" VARCHAR(36) NOT NULL,
    "bookingId" VARCHAR(36) NOT NULL,
    "senderType" "BookingMessageSenderType" NOT NULL,
    "senderEmail" VARCHAR(320) NOT NULL,
    "messageContent" TEXT NOT NULL,
    "readStatus" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "booking_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "donations" (
    "id" VARCHAR(36) NOT NULL,
    "userId" VARCHAR(36) NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "donationDate" TIMESTAMP(3),
    "donationDescription" TEXT,
    "specialOccasion" VARCHAR(255),
    "category" VARCHAR(100),
    "status" "PaymentApprovalStatus" DEFAULT 'pending',
    "approvalDate" TIMESTAMP(3),
    "paymentStatus" "PaymentStatus",
    "receiptNumber" VARCHAR(50),
    "receiptPdf" VARCHAR(500),
    "receiptGeneratedAt" TIMESTAMP(3),
    "contactNumber" VARCHAR(15),
    "email" VARCHAR(320),
    "communicationPreference" VARCHAR(50),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "donations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" VARCHAR(36) NOT NULL,
    "userId" VARCHAR(36) NOT NULL,
    "planType" "SubscriptionPlanType" NOT NULL DEFAULT 'premium',
    "amount" DECIMAL(10,2) NOT NULL,
    "billingCycle" VARCHAR(100) NOT NULL,
    "customDonation" DECIMAL(10,2),
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "durationMonths" INTEGER NOT NULL,
    "renewalType" "RenewalType" NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" "SubscriptionRecordStatus" NOT NULL DEFAULT 'pending',
    "transactionId" VARCHAR(100),
    "transactionRef" VARCHAR(100),
    "adminNotes" TEXT,
    "description" TEXT,
    "userIdText" VARCHAR(100),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pending_subscriptions" (
    "id" VARCHAR(36) NOT NULL,
    "email" VARCHAR(320) NOT NULL,
    "fullName" VARCHAR(255) NOT NULL,
    "contactNumber" VARCHAR(15) NOT NULL,
    "subscriptionType" VARCHAR(50) NOT NULL,
    "transactionId" VARCHAR(100) NOT NULL,
    "userId" VARCHAR(36) NOT NULL,
    "subscriptionId" VARCHAR(36) NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'pending',
    "paymentStatus" "PaymentStatus" NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "renewalDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pending_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" VARCHAR(36) NOT NULL,
    "userId" VARCHAR(36) NOT NULL,
    "approvedById" VARCHAR(36),
    "amount" DECIMAL(10,2) NOT NULL,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "customDonation" DECIMAL(10,2),
    "planType" VARCHAR(50),
    "billingCycle" VARCHAR(100) NOT NULL,
    "subscriptionType" VARCHAR(50),
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" "PaymentApprovalStatus",
    "paymentStatus" "PaymentStatus",
    "transactionId" VARCHAR(100),
    "transactionRef" VARCHAR(100),
    "paymentMethod" VARCHAR(50),
    "receiptPdf" VARCHAR(500),
    "receiptId" VARCHAR(100),
    "receiptNumber" VARCHAR(50),
    "receiptGeneratedAt" TIMESTAMP(3),
    "receiptSentAt" TIMESTAMP(3),
    "resendReceipt" BOOLEAN NOT NULL DEFAULT false,
    "adminNotes" TEXT,
    "approvedAt" TIMESTAMP(3),
    "email" VARCHAR(320) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approval_logs" (
    "id" VARCHAR(36) NOT NULL,
    "adminId" VARCHAR(36) NOT NULL,
    "adminName" VARCHAR(255) NOT NULL,
    "action" "ApprovalLogAction" NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "approval_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "temple_accounts" (
    "id" VARCHAR(36) NOT NULL,
    "memberName" VARCHAR(255) NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "category" VARCHAR(100) NOT NULL,
    "date" DATE NOT NULL,
    "month" VARCHAR(20),
    "year" INTEGER,
    "classification" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "transactionId" VARCHAR(100) NOT NULL,
    "subscriptionId" VARCHAR(100),
    "status" VARCHAR(50),
    "notes" TEXT,
    "entryType" VARCHAR(50),
    "subscriptionType" "SubscriptionType",
    "annadhanamAmount" DECIMAL(10,2),
    "templeMaintenanceAmount" DECIMAL(10,2),
    "goshalaAmount" DECIMAL(10,2),
    "vedaPathshalaAmount" DECIMAL(10,2),
    "generalFundAmount" DECIMAL(10,2),
    "totalAmount" DECIMAL(10,2),
    "poojaServicesAmount" DECIMAL(10,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "temple_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expenses" (
    "id" VARCHAR(36) NOT NULL,
    "categoryId" VARCHAR(36) NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "date" DATE NOT NULL,
    "paidTo" VARCHAR(255),
    "paymentMethod" VARCHAR(50),
    "billFile" VARCHAR(500),
    "createdBy" VARCHAR(255) NOT NULL,
    "quantity" INTEGER,
    "classification" VARCHAR(100),
    "voucherId" VARCHAR(100),
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "classifications" (
    "id" VARCHAR(36) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "createdBy" VARCHAR(255),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "classifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "membership_fees" (
    "id" VARCHAR(36) NOT NULL,
    "userId" VARCHAR(100) NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "signupDate" DATE NOT NULL,
    "createdAtField" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "membership_fees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gallery" (
    "id" VARCHAR(36) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "image" VARCHAR(500),
    "uploadedBy" VARCHAR(255),
    "order" INTEGER,
    "categoryId" VARCHAR(36),
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "storageSize" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gallery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "volunteer_participation" (
    "id" VARCHAR(36) NOT NULL,
    "userId" VARCHAR(100) NOT NULL,
    "eventName" VARCHAR(255) NOT NULL,
    "participationDate" DATE NOT NULL,
    "hours" INTEGER,
    "status" "VolunteerStatus",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "volunteer_participation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_messages" (
    "id" VARCHAR(36) NOT NULL,
    "userId" VARCHAR(100) NOT NULL,
    "message" TEXT NOT NULL,
    "languagePreference" "PreferredLanguage",
    "sentDate" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "readStatus" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_preferences" (
    "id" VARCHAR(36) NOT NULL,
    "userId" VARCHAR(100) NOT NULL,
    "preferredLanguage" "PreferredLanguage",
    "communicationLanguage" VARCHAR(50),
    "notificationPreference" "NotificationPreference",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_reminders" (
    "id" VARCHAR(36) NOT NULL,
    "email" VARCHAR(320) NOT NULL,
    "subscriptionId" VARCHAR(100) NOT NULL,
    "reminderDate" DATE NOT NULL,
    "sentDate" TIMESTAMP(3),
    "status" "SubscriptionReminderStatus",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_reminders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "page_access" (
    "id" VARCHAR(36) NOT NULL,
    "userId" VARCHAR(100) NOT NULL,
    "pageRoute" VARCHAR(255) NOT NULL,
    "accessLevel" "PageAccessLevel" NOT NULL DEFAULT 'view',
    "grantedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "grantedBy" VARCHAR(100),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "page_access_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "premium_upgrade_requests" (
    "id" VARCHAR(36) NOT NULL,
    "email" VARCHAR(320) NOT NULL,
    "transactionId" VARCHAR(100) NOT NULL,
    "status" "PaymentApprovalStatus",
    "membershipType" VARCHAR(50) NOT NULL,
    "adminNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "premium_upgrade_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_integrated_ai_messages" (
    "id" VARCHAR(36) NOT NULL,
    "userId" VARCHAR(100),
    "role" "AiMessageRole" NOT NULL,
    "content" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "_integrated_ai_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_integrated_ai_images" (
    "id" VARCHAR(36) NOT NULL,
    "file" VARCHAR(500) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "_integrated_ai_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" VARCHAR(36) NOT NULL,
    "userId" VARCHAR(100) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "message" TEXT NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vouchers" (
    "id" VARCHAR(36) NOT NULL,
    "voucherId" VARCHAR(100) NOT NULL,
    "expenseId" VARCHAR(36),
    "amount" DECIMAL(10,2) NOT NULL,
    "category" VARCHAR(100),
    "paidTo" VARCHAR(255),
    "date" DATE,
    "description" TEXT,
    "status" VARCHAR(50),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vouchers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" VARCHAR(36) NOT NULL,
    "entityType" VARCHAR(50) NOT NULL,
    "entityId" VARCHAR(36) NOT NULL,
    "action" VARCHAR(20) NOT NULL,
    "changes" JSONB,
    "performedBy" VARCHAR(36),
    "performedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" VARCHAR(45),
    "userAgent" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_queue" (
    "id" VARCHAR(36) NOT NULL,
    "to" VARCHAR(320) NOT NULL,
    "subject" VARCHAR(500) NOT NULL,
    "body" TEXT NOT NULL,
    "attachments" JSONB,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_queue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_dead_letter" (
    "id" VARCHAR(36) NOT NULL,
    "to" VARCHAR(320) NOT NULL,
    "subject" VARCHAR(500) NOT NULL,
    "body" TEXT NOT NULL,
    "attachments" JSONB,
    "error" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL,
    "originalCreatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_dead_letter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_tokenKey_key" ON "users"("tokenKey");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_membershipTier_idx" ON "users"("membershipTier");

-- CreateIndex
CREATE INDEX "users_approvalStatus_idx" ON "users"("approvalStatus");

-- CreateIndex
CREATE INDEX "users_accountType_idx" ON "users"("accountType");

-- CreateIndex
CREATE INDEX "users_isDeleted_idx" ON "users"("isDeleted");

-- CreateIndex
CREATE INDEX "users_isBlocked_idx" ON "users"("isBlocked");

-- CreateIndex
CREATE INDEX "users_createdAt_idx" ON "users"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "account_types_name_key" ON "account_types"("name");

-- CreateIndex
CREATE UNIQUE INDEX "expense_categories_name_key" ON "expense_categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "photo_categories_name_key" ON "photo_categories"("name");

-- CreateIndex
CREATE INDEX "festivals_status_idx" ON "festivals"("status");

-- CreateIndex
CREATE INDEX "poojas_category_idx" ON "poojas"("category");

-- CreateIndex
CREATE INDEX "poojas_status_idx" ON "poojas"("status");

-- CreateIndex
CREATE INDEX "poojas_isArchived_idx" ON "poojas"("isArchived");

-- CreateIndex
CREATE INDEX "poojas_isDeleted_idx" ON "poojas"("isDeleted");

-- CreateIndex
CREATE INDEX "poojas_festivalId_idx" ON "poojas"("festivalId");

-- CreateIndex
CREATE INDEX "poojas_category_status_idx" ON "poojas"("category", "status");

-- CreateIndex
CREATE UNIQUE INDEX "pooja_bookings_receiptNumber_key" ON "pooja_bookings"("receiptNumber");

-- CreateIndex
CREATE INDEX "pooja_bookings_userId_idx" ON "pooja_bookings"("userId");

-- CreateIndex
CREATE INDEX "pooja_bookings_poojaId_idx" ON "pooja_bookings"("poojaId");

-- CreateIndex
CREATE INDEX "pooja_bookings_bookingStatus_idx" ON "pooja_bookings"("bookingStatus");

-- CreateIndex
CREATE INDEX "pooja_bookings_isDeleted_idx" ON "pooja_bookings"("isDeleted");

-- CreateIndex
CREATE INDEX "pooja_bookings_userId_bookingStatus_idx" ON "pooja_bookings"("userId", "bookingStatus");

-- CreateIndex
CREATE INDEX "pooja_bookings_createdAt_idx" ON "pooja_bookings"("createdAt");

-- CreateIndex
CREATE INDEX "booking_messages_bookingId_idx" ON "booking_messages"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "donations_receiptNumber_key" ON "donations"("receiptNumber");

-- CreateIndex
CREATE INDEX "donations_userId_idx" ON "donations"("userId");

-- CreateIndex
CREATE INDEX "donations_status_idx" ON "donations"("status");

-- CreateIndex
CREATE INDEX "donations_isDeleted_idx" ON "donations"("isDeleted");

-- CreateIndex
CREATE INDEX "donations_userId_status_idx" ON "donations"("userId", "status");

-- CreateIndex
CREATE INDEX "donations_userId_donationDate_idx" ON "donations"("userId", "donationDate");

-- CreateIndex
CREATE INDEX "donations_createdAt_idx" ON "donations"("createdAt");

-- CreateIndex
CREATE INDEX "subscriptions_userId_idx" ON "subscriptions"("userId");

-- CreateIndex
CREATE INDEX "subscriptions_status_idx" ON "subscriptions"("status");

-- CreateIndex
CREATE INDEX "subscriptions_planType_idx" ON "subscriptions"("planType");

-- CreateIndex
CREATE INDEX "subscriptions_endDate_idx" ON "subscriptions"("endDate");

-- CreateIndex
CREATE INDEX "subscriptions_userId_status_idx" ON "subscriptions"("userId", "status");

-- CreateIndex
CREATE INDEX "pending_subscriptions_userId_idx" ON "pending_subscriptions"("userId");

-- CreateIndex
CREATE INDEX "pending_subscriptions_subscriptionId_idx" ON "pending_subscriptions"("subscriptionId");

-- CreateIndex
CREATE INDEX "pending_subscriptions_status_idx" ON "pending_subscriptions"("status");

-- CreateIndex
CREATE INDEX "pending_subscriptions_paymentStatus_idx" ON "pending_subscriptions"("paymentStatus");

-- CreateIndex
CREATE UNIQUE INDEX "payments_receiptNumber_key" ON "payments"("receiptNumber");

-- CreateIndex
CREATE INDEX "payments_userId_idx" ON "payments"("userId");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "payments"("status");

-- CreateIndex
CREATE INDEX "payments_userId_status_idx" ON "payments"("userId", "status");

-- CreateIndex
CREATE INDEX "payments_createdAt_idx" ON "payments"("createdAt");

-- CreateIndex
CREATE INDEX "approval_logs_adminId_idx" ON "approval_logs"("adminId");

-- CreateIndex
CREATE INDEX "approval_logs_action_idx" ON "approval_logs"("action");

-- CreateIndex
CREATE INDEX "approval_logs_timestamp_idx" ON "approval_logs"("timestamp");

-- CreateIndex
CREATE INDEX "temple_accounts_category_idx" ON "temple_accounts"("category");

-- CreateIndex
CREATE INDEX "temple_accounts_date_idx" ON "temple_accounts"("date");

-- CreateIndex
CREATE INDEX "temple_accounts_month_year_idx" ON "temple_accounts"("month", "year");

-- CreateIndex
CREATE INDEX "temple_accounts_classification_idx" ON "temple_accounts"("classification");

-- CreateIndex
CREATE INDEX "temple_accounts_createdAt_idx" ON "temple_accounts"("createdAt");

-- CreateIndex
CREATE INDEX "expenses_categoryId_idx" ON "expenses"("categoryId");

-- CreateIndex
CREATE INDEX "expenses_date_idx" ON "expenses"("date");

-- CreateIndex
CREATE INDEX "expenses_createdAt_idx" ON "expenses"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "classifications_name_key" ON "classifications"("name");

-- CreateIndex
CREATE INDEX "membership_fees_userId_idx" ON "membership_fees"("userId");

-- CreateIndex
CREATE INDEX "gallery_categoryId_idx" ON "gallery"("categoryId");

-- CreateIndex
CREATE INDEX "gallery_isPublished_idx" ON "gallery"("isPublished");

-- CreateIndex
CREATE INDEX "gallery_order_idx" ON "gallery"("order");

-- CreateIndex
CREATE INDEX "volunteer_participation_userId_idx" ON "volunteer_participation"("userId");

-- CreateIndex
CREATE INDEX "admin_messages_userId_idx" ON "admin_messages"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "user_preferences_userId_key" ON "user_preferences"("userId");

-- CreateIndex
CREATE INDEX "subscription_reminders_email_idx" ON "subscription_reminders"("email");

-- CreateIndex
CREATE INDEX "subscription_reminders_status_idx" ON "subscription_reminders"("status");

-- CreateIndex
CREATE INDEX "page_access_userId_idx" ON "page_access"("userId");

-- CreateIndex
CREATE INDEX "page_access_pageRoute_idx" ON "page_access"("pageRoute");

-- CreateIndex
CREATE INDEX "premium_upgrade_requests_email_idx" ON "premium_upgrade_requests"("email");

-- CreateIndex
CREATE INDEX "premium_upgrade_requests_status_idx" ON "premium_upgrade_requests"("status");

-- CreateIndex
CREATE INDEX "_integrated_ai_messages_userId_idx" ON "_integrated_ai_messages"("userId");

-- CreateIndex
CREATE INDEX "notifications_userId_idx" ON "notifications"("userId");

-- CreateIndex
CREATE INDEX "notifications_isRead_idx" ON "notifications"("isRead");

-- CreateIndex
CREATE UNIQUE INDEX "vouchers_voucherId_key" ON "vouchers"("voucherId");

-- CreateIndex
CREATE INDEX "vouchers_expenseId_idx" ON "vouchers"("expenseId");

-- CreateIndex
CREATE INDEX "audit_logs_entityType_entityId_idx" ON "audit_logs"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "audit_logs_performedBy_idx" ON "audit_logs"("performedBy");

-- CreateIndex
CREATE INDEX "audit_logs_performedAt_idx" ON "audit_logs"("performedAt");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "email_queue_status_nextAttemptAt_idx" ON "email_queue"("status", "nextAttemptAt");

-- AddForeignKey
ALTER TABLE "poojas" ADD CONSTRAINT "poojas_festivalId_fkey" FOREIGN KEY ("festivalId") REFERENCES "festivals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pooja_bookings" ADD CONSTRAINT "pooja_bookings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pooja_bookings" ADD CONSTRAINT "pooja_bookings_poojaId_fkey" FOREIGN KEY ("poojaId") REFERENCES "poojas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_messages" ADD CONSTRAINT "booking_messages_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "pooja_bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "donations" ADD CONSTRAINT "donations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pending_subscriptions" ADD CONSTRAINT "pending_subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pending_subscriptions" ADD CONSTRAINT "pending_subscriptions_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_logs" ADD CONSTRAINT "approval_logs_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "expense_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gallery" ADD CONSTRAINT "gallery_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "photo_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_integrated_ai_messages" ADD CONSTRAINT "_integrated_ai_messages_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "expenses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_performedBy_fkey" FOREIGN KEY ("performedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
