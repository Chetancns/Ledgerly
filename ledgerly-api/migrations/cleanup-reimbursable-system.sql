-- ============================================================================
-- CLEANUP SCRIPT: Remove Reimbursable Transaction System
-- ============================================================================
-- This script removes the complex reimbursable transaction and settlement
-- features added in the previous commits, simplifying to debt-based approach
-- ============================================================================

-- Step 1: Drop settlements table (added in commit 9a4cb8e)
DROP TABLE IF EXISTS dbo.settlements CASCADE;

-- Step 2: Remove reimbursable-related columns from transactions table
-- (added in commits 1b448f5, 5738596)
ALTER TABLE dbo.transactions 
DROP COLUMN IF EXISTS "counterpartyName",
DROP COLUMN IF EXISTS "isReimbursable",
DROP COLUMN IF EXISTS "settlementGroupId",
DROP COLUMN IF EXISTS "reimbursedAmount",
DROP COLUMN IF EXISTS "paidBy";

-- Step 3: Add settlementGroupId to debts table for grouping
-- This allows grouping multiple debts for batch settlement
ALTER TABLE dbo.debts 
ADD COLUMN IF NOT EXISTS "settlementGroupId" varchar(200) NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_debts_settlement_group 
ON dbo.debts("settlementGroupId") 
WHERE "settlementGroupId" IS NOT NULL;

-- Create index for filtering by counterparty
CREATE INDEX IF NOT EXISTS idx_debts_counterparty 
ON dbo.debts("counterpartyName") 
WHERE "counterpartyName" IS NOT NULL;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these to verify the cleanup was successful:

-- 1. Check settlements table is gone
-- SELECT * FROM information_schema.tables WHERE table_name = 'settlements';
-- (Should return 0 rows)

-- 2. Check transactions columns removed
-- SELECT column_name FROM information_schema.columns 
-- WHERE table_name = 'transactions' AND table_schema = 'dbo';
-- (Should NOT show counterpartyName, isReimbursable, settlementGroupId, reimbursedAmount, paidBy)

-- 3. Check debts has new column
-- SELECT column_name FROM information_schema.columns 
-- WHERE table_name = 'debts' AND table_schema = 'dbo' AND column_name = 'settlementGroupId';
-- (Should return 1 row)

-- ============================================================================
-- NOTES
-- ============================================================================
-- After running this script:
-- 1. All settlement records will be deleted (they're in separate table)
-- 2. Transaction reimbursable data will be lost (use debt system going forward)
-- 3. Debts can now be grouped using settlementGroupId
-- 4. Dashboard and insights will continue to work (they use transactions/debts)
-- ============================================================================
