-- Create settlements table for tracking reimbursement settlements
-- Run this migration after the reimbursement features migration

-- Create settlements table
CREATE TABLE IF NOT EXISTS dbo.settlements (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL REFERENCES dbo."user"("id") ON DELETE CASCADE,
  "settlementGroupId" VARCHAR(255),
  "counterpartyName" VARCHAR(255),
  "amount" DECIMAL(10, 2) NOT NULL,
  "settlementDate" DATE NOT NULL,
  "notes" TEXT,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS "idx_settlements_userId" ON dbo.settlements("userId");
CREATE INDEX IF NOT EXISTS "idx_settlements_settlementGroupId" ON dbo.settlements("settlementGroupId");
CREATE INDEX IF NOT EXISTS "idx_settlements_counterpartyName" ON dbo.settlements("counterpartyName");
CREATE INDEX IF NOT EXISTS "idx_settlements_settlementDate" ON dbo.settlements("settlementDate");

-- Rollback script (uncomment to revert)
-- DROP TABLE IF EXISTS dbo.settlements;
