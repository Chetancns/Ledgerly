-- Migration: Update Debts for Flexible Payments
-- This migration allows P2P debts to have flexible payment amounts instead of fixed installments
-- Date: 2026-01-18

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
ADD amount NUMERIC(12, 2) NOT NULL DEFAULT 0;

-- Update existing debt_updates with amount from their debt's installmentAmount
UPDATE dbo.debt_updates du
SET amount = COALESCE(
  (SELECT d."installmentAmount" FROM dbo.debts d WHERE d.id = du."debtId"),
  0
)
WHERE du.amount = 0;

-- Comments for documentation
COMMENT ON COLUMN dbo.debts."installmentAmount" IS 'Fixed installment amount for institutional debts, optional for P2P debts with flexible payments';
COMMENT ON COLUMN dbo.debts.frequency IS 'Payment frequency for institutional debts, optional for P2P debts';
COMMENT ON COLUMN dbo.debts."nextDueDate" IS 'Next due date for institutional debts, not applicable for P2P debts with flexible payments';
COMMENT ON COLUMN dbo.debt_updates.amount IS 'Amount paid in this specific payment (can vary for P2P debts)';
