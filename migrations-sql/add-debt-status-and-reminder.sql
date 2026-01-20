-- Migration: Add debt status and reminder date support
-- This adds the ability to track completed debts and set reminder dates for P2P debts

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

-- Add comment for documentation
COMMENT ON COLUMN dbo.debts.status IS 'Debt status: active or completed (automatically set when balance reaches zero)';
COMMENT ON COLUMN dbo.debts."reminderDate" IS 'Reminder date for P2P debts (when to send/receive payment)';
