-- Migration: Add transactionId to repayments table
-- This enables tracking which transaction was created for each repayment
-- and allows proper cleanup when repayments are deleted

-- Add transactionId column to repayments
ALTER TABLE dbo.repayments 
ADD COLUMN IF NOT EXISTS "transactionId" uuid NULL;

-- Add comment explaining the column
COMMENT ON COLUMN dbo.repayments."transactionId" IS 'Links to the transaction created when this repayment was made (if accountId was provided)';

-- Verification query
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'dbo' 
AND table_name = 'repayments'
AND column_name = 'transactionId';

-- Rollback (if needed):
-- ALTER TABLE dbo.repayments DROP COLUMN IF EXISTS "transactionId";
