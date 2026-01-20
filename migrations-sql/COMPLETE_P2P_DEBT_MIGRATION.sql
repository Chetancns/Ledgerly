-- ============================================================================
-- COMPLETE P2P DEBT MODULE MIGRATION FOR PRODUCTION
-- ============================================================================
-- This script contains ALL database changes for the P2P debt feature
-- Run this script in a PostgreSQL transaction for safety
-- 
-- Features included:
-- 1. P2P debt support (borrowed/lent) with person names
-- 2. Flexible payment amounts (variable payments for P2P debts)
-- 3. Debt status tracking (active/completed)
-- 4. Reminder dates for payment notifications
--
-- Prerequisites:
-- - Ensure you have the uuid-ossp extension installed
-- - Backup your database before running
-- 
-- Date: 2026-01-20
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Enable uuid-ossp extension (if not already enabled)
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- STEP 2: Add P2P Debt Support
-- ============================================================================

-- Add debtType column to debts table (institutional, borrowed, lent)
-- Default to 'institutional' for backward compatibility
ALTER TABLE dbo.debts 
ADD COLUMN debtType VARCHAR NOT NULL DEFAULT 'institutional';

-- Add personName column to debts table (for borrowed/lent debts)
ALTER TABLE dbo.debts 
ADD COLUMN personName VARCHAR;

-- Add check constraint for debtType
ALTER TABLE dbo.debts 
ADD CONSTRAINT CHK_debts_debtType 
CHECK (debtType IN ('institutional', 'borrowed', 'lent'));

-- Create person_names table for storing person name suggestions
CREATE TABLE IF NOT EXISTS dbo.person_names (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "userId" UUID NOT NULL,
    name VARCHAR NOT NULL,
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT FK_person_names_user FOREIGN KEY ("userId") REFERENCES dbo.users(id) ON DELETE CASCADE
);

-- Create indexes on person_names table for performance
CREATE INDEX IF NOT EXISTS IDX_person_names_userId ON dbo.person_names ("userId");
CREATE INDEX IF NOT EXISTS IDX_person_names_name ON dbo.person_names (name);

-- ============================================================================
-- STEP 3: Add Flexible Payment Support
-- ============================================================================

-- Make installmentAmount nullable (optional for P2P debts with flexible payments)
ALTER TABLE dbo.debts 
ALTER COLUMN "installmentAmount" DROP NOT NULL;

-- Make frequency nullable (optional for P2P debts)
ALTER TABLE dbo.debts 
ALTER COLUMN frequency DROP NOT NULL;

-- Make nextDueDate nullable (not applicable for P2P debts with flexible payments)
ALTER TABLE dbo.debts 
ALTER COLUMN "nextDueDate" DROP NOT NULL;

-- Add amount column to debt_updates to track individual payment amounts
ALTER TABLE dbo.debt_updates 
ADD COLUMN amount NUMERIC(12, 2) NOT NULL DEFAULT 0;

-- Update existing debt_updates with amount from their debt's installmentAmount
UPDATE dbo.debt_updates du
SET amount = COALESCE(
  (SELECT d."installmentAmount" FROM dbo.debts d WHERE d.id = du."debtId"),
  0
)
WHERE du.amount = 0;

-- ============================================================================
-- STEP 4: Add Status and Reminder Support
-- ============================================================================

-- Add status column with default 'active'
ALTER TABLE dbo.debts 
ADD COLUMN status VARCHAR(20) DEFAULT 'active' NOT NULL;

-- Add reminderDate column for P2P debt reminders
ALTER TABLE dbo.debts 
ADD COLUMN "reminderDate" DATE;

-- Update existing debts where balance is 0 to 'completed' status
UPDATE dbo.debts 
SET status = 'completed' 
WHERE "currentBalance"::NUMERIC <= 0;

-- ============================================================================
-- STEP 5: Add Documentation Comments
-- ============================================================================

-- Debt table comments
COMMENT ON COLUMN dbo.debts.debtType IS 'Type of debt: institutional (loans/credit cards), borrowed (I owe someone), lent (someone owes me)';
COMMENT ON COLUMN dbo.debts.personName IS 'Name of person for borrowed/lent debts (can be anyone, not limited to app users)';
COMMENT ON COLUMN dbo.debts."installmentAmount" IS 'Fixed installment amount for institutional debts, optional for P2P debts with flexible payments';
COMMENT ON COLUMN dbo.debts.frequency IS 'Payment frequency for institutional debts, optional for P2P debts';
COMMENT ON COLUMN dbo.debts."nextDueDate" IS 'Next due date for institutional debts, not applicable for P2P debts with flexible payments';
COMMENT ON COLUMN dbo.debts.status IS 'Debt status: active or completed (automatically set when balance reaches zero)';
COMMENT ON COLUMN dbo.debts."reminderDate" IS 'Reminder date for P2P debts (when to send/receive payment)';

-- Person names table comment
COMMENT ON TABLE dbo.person_names IS 'Stores unique person names for autocomplete suggestions in P2P debts';

-- Debt updates table comment
COMMENT ON COLUMN dbo.debt_updates.amount IS 'Amount paid in this specific payment (can vary for P2P debts)';

-- ============================================================================
-- STEP 6: Verify Migration
-- ============================================================================

-- Display summary of changes
DO $$
DECLARE
    debt_count INTEGER;
    active_debt_count INTEGER;
    completed_debt_count INTEGER;
    p2p_debt_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO debt_count FROM dbo.debts;
    SELECT COUNT(*) INTO active_debt_count FROM dbo.debts WHERE status = 'active';
    SELECT COUNT(*) INTO completed_debt_count FROM dbo.debts WHERE status = 'completed';
    SELECT COUNT(*) INTO p2p_debt_count FROM dbo.debts WHERE debtType IN ('borrowed', 'lent');
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'P2P Debt Migration Summary:';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Total debts: %', debt_count;
    RAISE NOTICE 'Active debts: %', active_debt_count;
    RAISE NOTICE 'Completed debts: %', completed_debt_count;
    RAISE NOTICE 'P2P debts (borrowed/lent): %', p2p_debt_count;
    RAISE NOTICE 'Institutional debts: %', debt_count - p2p_debt_count;
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Migration completed successfully!';
    RAISE NOTICE '========================================';
END $$;

-- Commit the transaction
COMMIT;

-- ============================================================================
-- ROLLBACK SCRIPT (For emergency use only)
-- ============================================================================
-- If you need to rollback these changes, uncomment and run the following:
-- 
-- BEGIN;
-- 
-- -- Remove new columns from debts table
-- ALTER TABLE dbo.debts DROP COLUMN IF EXISTS "reminderDate";
-- ALTER TABLE dbo.debts DROP COLUMN IF EXISTS status;
-- ALTER TABLE dbo.debts DROP CONSTRAINT IF EXISTS CHK_debts_debtType;
-- ALTER TABLE dbo.debts DROP COLUMN IF EXISTS personName;
-- ALTER TABLE dbo.debts DROP COLUMN IF EXISTS debtType;
-- 
-- -- Remove amount column from debt_updates
-- ALTER TABLE dbo.debt_updates DROP COLUMN IF EXISTS amount;
-- 
-- -- Restore NOT NULL constraints (if needed for old institutional debts)
-- -- ALTER TABLE dbo.debts ALTER COLUMN "installmentAmount" SET NOT NULL;
-- -- ALTER TABLE dbo.debts ALTER COLUMN frequency SET NOT NULL;
-- -- ALTER TABLE dbo.debts ALTER COLUMN "nextDueDate" SET NOT NULL;
-- 
-- -- Drop person_names table
-- DROP TABLE IF EXISTS dbo.person_names;
-- 
-- COMMIT;
-- ============================================================================
