-- Migration: Add notes column to debt_updates
-- Allows users to annotate individual debt payments (e.g. transfer reference numbers)

-- Add nullable notes column to store optional payment annotations
ALTER TABLE dbo.debt_updates
ADD COLUMN notes TEXT;

-- Add comment for documentation
COMMENT ON COLUMN dbo.debt_updates.notes IS 'Optional user-entered note for a payment (e.g. bank transfer reference)';
