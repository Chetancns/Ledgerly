-- Migration: Add P2P Debts Support
-- This migration extends the debt module to support person-to-person debts (borrowed/lent)
-- Date: 2026-01-18

-- Add debtType column to debts table (institutional, borrowed, lent)
ALTER TABLE dbo.debts 
ADD debtType VARCHAR NOT NULL DEFAULT 'institutional';

-- Add personName column to debts table (for borrowed/lent debts)
ALTER TABLE dbo.debts 
ADD personName VARCHAR;

-- Create person_names table for storing person name suggestions
-- Note: Requires uuid-ossp extension for uuid_generate_v4()
-- Run: CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE TABLE dbo.person_names (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "userId" UUID NOT NULL,
    name VARCHAR NOT NULL,
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT FK_person_names_user FOREIGN KEY ("userId") REFERENCES dbo.users(id) ON DELETE CASCADE
);

-- Create indexes on person_names table
CREATE INDEX IDX_person_names_userId ON dbo.person_names ("userId");
CREATE INDEX IDX_person_names_name ON dbo.person_names (name);

-- Add check constraint for debtType
ALTER TABLE dbo.debts 
ADD CONSTRAINT CHK_debts_debtType 
CHECK (debtType IN ('institutional', 'borrowed', 'lent'));

-- Comments for documentation
COMMENT ON COLUMN dbo.debts.debtType IS 'Type of debt: institutional (loans/credit cards), borrowed (I owe someone), lent (someone owes me)';
COMMENT ON COLUMN dbo.debts.personName IS 'Name of person for borrowed/lent debts';
COMMENT ON TABLE dbo.person_names IS 'Stores unique person names for autocomplete suggestions in P2P debts';
