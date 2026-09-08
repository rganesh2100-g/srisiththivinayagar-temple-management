-- AlterTable
ALTER TABLE "contact_inquiries" ADD COLUMN     "status" VARCHAR(50);

-- Constraint: users.name must be at least 2 characters
ALTER TABLE "users" ADD CONSTRAINT "users_name_min_length_check" CHECK (length("name") >= 2);

-- Constraint: users.pincode must be exactly 6 characters
ALTER TABLE "users" ADD CONSTRAINT "users_pincode_length_check" CHECK (length("pincode") = 6);

-- Constraint: poojas.donationAmount must be non-negative
ALTER TABLE "poojas" ADD CONSTRAINT "poojas_donation_amount_nonnegative_check" CHECK ("donationAmount" >= 0);

-- Constraint: poojas.price must be non-negative
ALTER TABLE "poojas" ADD CONSTRAINT "poojas_price_nonnegative_check" CHECK ("price" >= 0);

-- Constraint: pooja_bookings.donationAmount must be non-negative
-- (>= 0, not >= 1, because the app allows free pooja bookings → donationAmount can be 0)
ALTER TABLE "pooja_bookings" ADD CONSTRAINT "pooja_bookings_donation_amount_nonnegative_check" CHECK ("donationAmount" >= 0);

-- Constraint: donations.amount must be positive
ALTER TABLE "donations" ADD CONSTRAINT "donations_amount_positive_check" CHECK ("amount" > 0);

-- Constraint: subscriptions.amount must be non-negative
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_amount_nonnegative_check" CHECK ("amount" >= 0);

-- Constraint: subscriptions.totalAmount must be non-negative
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_total_amount_nonnegative_check" CHECK ("totalAmount" >= 0);

-- Constraint: subscriptions.durationMonths must be between 1 and 120
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_duration_months_range_check" CHECK ("durationMonths" >= 1 AND "durationMonths" <= 120);

-- Constraint: subscriptions.endDate must be after startDate
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_end_date_after_start_date_check" CHECK ("endDate" > "startDate");

-- Constraint: payments.amount must be positive
ALTER TABLE "payments" ADD CONSTRAINT "payments_amount_positive_check" CHECK ("amount" > 0);

-- Constraint: payments.totalAmount must be positive
ALTER TABLE "payments" ADD CONSTRAINT "payments_total_amount_positive_check" CHECK ("totalAmount" > 0);

-- Constraint: temple_accounts.amount must be non-negative
ALTER TABLE "temple_accounts" ADD CONSTRAINT "temple_accounts_amount_nonnegative_check" CHECK ("amount" >= 0);

-- Constraint: expenses.amount must be at least 0.01
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_amount_minimum_check" CHECK ("amount" >= 0.01);

-- Constraint: expenses.quantity must be non-negative
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_quantity_nonnegative_check" CHECK ("quantity" >= 0);

-- Constraint: membership_fees.amount must be non-negative
ALTER TABLE "membership_fees" ADD CONSTRAINT "membership_fees_amount_nonnegative_check" CHECK ("amount" >= 0);

-- Constraint: volunteer_participation.hours must be non-negative
ALTER TABLE "volunteer_participation" ADD CONSTRAINT "volunteer_participation_hours_nonnegative_check" CHECK ("hours" >= 0);

-- Constraint: vouchers.amount must be non-negative
ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_amount_nonnegative_check" CHECK ("amount" >= 0);

-- Constraint: audit_logs.action must be one of the allowed values
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_action_values_check" CHECK ("action" IN ('create', 'update', 'delete', 'approve', 'reject'));

-- Constraint: email_queue.status must be one of the allowed values
ALTER TABLE "email_queue" ADD CONSTRAINT "email_queue_status_values_check" CHECK ("status" IN ('pending', 'processing', 'sent', 'failed', 'dead'));

-- Constraint: email_queue.attempts must be between 0 and 3
ALTER TABLE "email_queue" ADD CONSTRAINT "email_queue_attempts_range_check" CHECK ("attempts" >= 0 AND "attempts" <= 3);
