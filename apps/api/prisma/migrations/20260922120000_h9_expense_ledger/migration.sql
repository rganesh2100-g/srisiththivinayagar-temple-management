-- H9: Expense & Financial Ledger mirror support.
--
-- The expense ledger writes legitimate NEGATIVE amounts into temple_accounts
-- (an expense posts amount = -amount, see ExpenseManagerPage). The phase0
-- migration added a blanket CHECK ("amount" >= 0), which blocks those rows.
-- This constraint cannot be expressed in schema.prisma (Prisma does not model
-- CHECK constraints), so it was introduced as raw SQL and is now dropped here.
--
-- Only the temple_accounts CHECK is removed. All other constraints (expenses,
-- vouchers, etc.) are untouched.

ALTER TABLE "temple_accounts" DROP CONSTRAINT "temple_accounts_amount_nonnegative_check";