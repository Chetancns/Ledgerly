-- Migration: Add paidBy field to transactions table for split-expense tracking
-- This enables tracking WHO actually paid for a transaction, supporting scenarios like:
-- 1. You pay, friend owes you (paidBy: 'you' or null)
-- 2. Friend pays, you owe them (paidBy: 'friend_name')

-- Add paidBy column to transactions
ALTER TABLE dbo.transactions 
ADD COLUMN "paidBy" varchar(200) NULL;

-- Add comment for documentation
COMMENT ON COLUMN dbo.transactions."paidBy" IS 'Who paid for this transaction: "you" (or null for user) or counterparty name. Used for split-expense tracking.';

-- Create index for performance when filtering by paidBy
CREATE INDEX idx_transactions_paidby ON dbo.transactions("paidBy") WHERE "isReimbursable" = true;

-- Existing transactions where user paid (default behavior)
-- We set paidBy to 'you' for clarity, but null also means user paid
UPDATE dbo.transactions 
SET "paidBy" = 'you' 
WHERE "isReimbursable" = true AND "paidBy" IS NULL;

-- Rollback script (run if you need to undo this migration)
-- DROP INDEX IF EXISTS idx_transactions_paidby;
-- ALTER TABLE dbo.transactions DROP COLUMN IF EXISTS "paidBy";
