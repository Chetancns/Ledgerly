-- Migration: Add Reimbursement and Enhanced Debt Management Features
-- Date: 2025-12-13
-- Description: Adds support for reimbursable transactions with settlement groups,
--              and enhances debt management with lending/borrowing roles and repayments

-- ================================================
-- PART 1: Enhance Transactions Table
-- ================================================

-- Add reimbursement-related columns to transactions
ALTER TABLE dbo.transactions
ADD COLUMN "counterpartyName" VARCHAR(200),
ADD COLUMN "isReimbursable" BOOLEAN DEFAULT false NOT NULL,
ADD COLUMN "settlementGroupId" VARCHAR(100),
ADD COLUMN "reimbursedAmount" NUMERIC(12,2) DEFAULT 0 NOT NULL,
ADD COLUMN "notes" TEXT;

-- Add index for filtering reimbursable transactions
CREATE INDEX idx_transactions_reimbursable ON dbo.transactions("isReimbursable") WHERE "isReimbursable" = true;
CREATE INDEX idx_transactions_settlement_group ON dbo.transactions("settlementGroupId") WHERE "settlementGroupId" IS NOT NULL;
CREATE INDEX idx_transactions_counterparty ON dbo.transactions("counterpartyName") WHERE "counterpartyName" IS NOT NULL;

COMMENT ON COLUMN dbo.transactions."counterpartyName" IS 'Person who will reimburse or was reimbursed';
COMMENT ON COLUMN dbo.transactions."isReimbursable" IS 'Whether this transaction is pending reimbursement';
COMMENT ON COLUMN dbo.transactions."settlementGroupId" IS 'Groups multiple transactions for batch settlement';
COMMENT ON COLUMN dbo.transactions."reimbursedAmount" IS 'Amount already reimbursed (cumulative)';
COMMENT ON COLUMN dbo.transactions."notes" IS 'Additional context for the transaction';

-- ================================================
-- PART 2: Enhance Debts Table
-- ================================================

-- Make accountId nullable for personal debts
ALTER TABLE dbo.debts
ALTER COLUMN "accountId" DROP NOT NULL;

-- Make institutional debt fields nullable
ALTER TABLE dbo.debts
ALTER COLUMN "installmentAmount" DROP NOT NULL,
ALTER COLUMN "frequency" DROP NOT NULL,
ALTER COLUMN "startDate" DROP NOT NULL,
ALTER COLUMN "nextDueDate" DROP NOT NULL;

-- Add lending/borrowing columns
ALTER TABLE dbo.debts
ADD COLUMN "role" VARCHAR(20) DEFAULT 'institutional' NOT NULL,
ADD COLUMN "counterpartyName" VARCHAR(200),
ADD COLUMN "paidAmount" NUMERIC(12,2) DEFAULT 0 NOT NULL,
ADD COLUMN "adjustmentTotal" NUMERIC(12,2) DEFAULT 0 NOT NULL,
ADD COLUMN "dueDate" DATE,
ADD COLUMN "status" VARCHAR(20) DEFAULT 'open' NOT NULL,
ADD COLUMN "notes" TEXT,
ADD COLUMN "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
ADD COLUMN "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL;

-- Add constraint for role enum
ALTER TABLE dbo.debts
ADD CONSTRAINT debts_role_check CHECK ("role" IN ('lent', 'borrowed', 'institutional'));

-- Add constraint for status enum
ALTER TABLE dbo.debts
ADD CONSTRAINT debts_status_check CHECK ("status" IN ('open', 'settled', 'overdue'));

-- Add indexes for filtering
CREATE INDEX idx_debts_role ON dbo.debts("role");
CREATE INDEX idx_debts_status ON dbo.debts("status");
CREATE INDEX idx_debts_counterparty ON dbo.debts("counterpartyName") WHERE "counterpartyName" IS NOT NULL;
CREATE INDEX idx_debts_due_date ON dbo.debts("dueDate") WHERE "dueDate" IS NOT NULL;

COMMENT ON COLUMN dbo.debts."role" IS 'Type of debt: lent (owed to me), borrowed (I owe), institutional (loan/credit)';
COMMENT ON COLUMN dbo.debts."counterpartyName" IS 'Person who borrowed from me or lent to me';
COMMENT ON COLUMN dbo.debts."paidAmount" IS 'Total amount paid back (for lent/borrowed debts)';
COMMENT ON COLUMN dbo.debts."adjustmentTotal" IS 'Sum of small extras (tips, interest adjustments, etc.)';
COMMENT ON COLUMN dbo.debts."dueDate" IS 'Date when debt should be settled';
COMMENT ON COLUMN dbo.debts."status" IS 'Current status: open, settled, overdue';
COMMENT ON COLUMN dbo.debts."notes" IS 'Additional context or terms';

-- ================================================
-- PART 3: Create Repayments Table
-- ================================================

-- Create repayments table for tracking individual repayments
CREATE TABLE dbo.repayments (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "debtId" UUID NOT NULL,
    "amount" NUMERIC(12,2) NOT NULL,
    "adjustmentAmount" NUMERIC(12,2) DEFAULT 0 NOT NULL,
    "date" DATE NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    CONSTRAINT fk_repayments_debt
        FOREIGN KEY ("debtId")
        REFERENCES dbo.debts("id")
        ON DELETE CASCADE
);

-- Add indexes for repayments
CREATE INDEX idx_repayments_debt ON dbo.repayments("debtId");
CREATE INDEX idx_repayments_date ON dbo.repayments("date");

COMMENT ON TABLE dbo.repayments IS 'Tracks individual repayment installments for lent/borrowed debts';
COMMENT ON COLUMN dbo.repayments."debtId" IS 'The debt this repayment applies to';
COMMENT ON COLUMN dbo.repayments."amount" IS 'Amount repaid (principal)';
COMMENT ON COLUMN dbo.repayments."adjustmentAmount" IS 'Additional amount (tip, interest, etc.)';
COMMENT ON COLUMN dbo.repayments."date" IS 'Date of repayment';
COMMENT ON COLUMN dbo.repayments."notes" IS 'Notes about this repayment';

-- ================================================
-- PART 4: Data Migration
-- ================================================

-- Set default role for existing debts
UPDATE dbo.debts
SET "role" = 'institutional'
WHERE "role" IS NULL;

-- Ensure all existing transactions have default values
UPDATE dbo.transactions
SET "isReimbursable" = false
WHERE "isReimbursable" IS NULL;

UPDATE dbo.transactions
SET "reimbursedAmount" = 0
WHERE "reimbursedAmount" IS NULL;

-- ================================================
-- ROLLBACK SCRIPT (for reference)
-- ================================================

/*
-- To rollback this migration:

-- Drop repayments table
DROP TABLE IF EXISTS dbo.repayments;

-- Remove debt enhancements
ALTER TABLE dbo.debts
DROP CONSTRAINT IF EXISTS debts_role_check,
DROP CONSTRAINT IF EXISTS debts_status_check,
DROP COLUMN IF EXISTS "role",
DROP COLUMN IF EXISTS "counterpartyName",
DROP COLUMN IF EXISTS "paidAmount",
DROP COLUMN IF EXISTS "adjustmentTotal",
DROP COLUMN IF EXISTS "dueDate",
DROP COLUMN IF EXISTS "status",
DROP COLUMN IF EXISTS "notes",
DROP COLUMN IF EXISTS "createdAt",
DROP COLUMN IF EXISTS "updatedAt";

-- Restore NOT NULL constraints
ALTER TABLE dbo.debts
ALTER COLUMN "accountId" SET NOT NULL,
ALTER COLUMN "installmentAmount" SET NOT NULL,
ALTER COLUMN "frequency" SET NOT NULL,
ALTER COLUMN "startDate" SET NOT NULL,
ALTER COLUMN "nextDueDate" SET NOT NULL;

-- Remove transaction enhancements
DROP INDEX IF EXISTS dbo.idx_transactions_reimbursable;
DROP INDEX IF EXISTS dbo.idx_transactions_settlement_group;
DROP INDEX IF EXISTS dbo.idx_transactions_counterparty;

ALTER TABLE dbo.transactions
DROP COLUMN IF EXISTS "counterpartyName",
DROP COLUMN IF EXISTS "isReimbursable",
DROP COLUMN IF EXISTS "settlementGroupId",
DROP COLUMN IF EXISTS "reimbursedAmount",
DROP COLUMN IF EXISTS "notes";
*/
