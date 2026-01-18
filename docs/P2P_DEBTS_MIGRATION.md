# P2P Debt Support Migration Guide

## Overview
This migration extends the debt module to support person-to-person debts (borrowed/lent amounts) in addition to institutional debts (loans/credit cards).

## Features Added

### Backend
1. **New Debt Types**: 
   - `institutional` - Existing loans/credit cards
   - `borrowed` - Money I owe to someone
   - `lent` - Money someone owes to me

2. **Person Name Management**:
   - New `person_names` table stores unique person names per user
   - Autocomplete suggestions when creating borrowed/lent debts

3. **Transaction Creation**:
   - Optional transaction creation when creating a debt
   - Optional transaction creation when paying installments
   - Correct transaction type (income for lent, expense for borrowed)

4. **Filtering**:
   - Filter debts by type in GET /debts endpoint

### Frontend
1. **Enhanced Debt Form**:
   - Debt type selector
   - Person name input with autocomplete
   - Transaction creation checkbox
   - Category selection for transactions

2. **Improved Debt List**:
   - Filter debts by type (all/institutional/borrowed/lent)
   - Visual badges showing debt type
   - Person name display
   - Payment modal with transaction creation option

## Database Migration

### Using TypeORM Migration (Recommended)
```bash
cd ledgerly-api
npm run migration:run
```

### Using SQL Script
Execute the SQL file directly in your PostgreSQL database:
```bash
psql -h localhost -U your_user -d ledgerly -f ../migrations-sql/add-p2p-debts-support.sql
```

### Manual SQL Execution
If you prefer to execute SQL manually:

```sql
-- Add debtType column
ALTER TABLE dbo.debts 
ADD debtType VARCHAR NOT NULL DEFAULT 'institutional';

-- Add personName column
ALTER TABLE dbo.debts 
ADD personName VARCHAR;

-- Create person_names table
CREATE TABLE dbo.person_names (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    name VARCHAR NOT NULL,
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT FK_person_names_user FOREIGN KEY ("userId") REFERENCES dbo.users(id) ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX IDX_person_names_userId ON dbo.person_names ("userId");
CREATE INDEX IDX_person_names_name ON dbo.person_names (name);

-- Add check constraint
ALTER TABLE dbo.debts 
ADD CONSTRAINT CHK_debts_debtType 
CHECK (debtType IN ('institutional', 'borrowed', 'lent'));
```

## API Changes

### New Endpoints
- `GET /debts/person-names/suggestions?search={query}` - Get person name suggestions
- `POST /debts/:id/pay-installment` - Pay installment with optional transaction creation

### Modified Endpoints
- `GET /debts?debtType={type}` - Now accepts optional debtType filter
- `POST /debts` - Now accepts additional fields:
  ```json
  {
    "debtType": "borrowed|lent|institutional",
    "personName": "John Doe",
    "createTransaction": true,
    "categoryId": "uuid",
    ... existing fields
  }
  ```

## Usage Examples

### Create Borrowed Debt with Transaction
```javascript
const debt = {
  name: "Emergency loan",
  debtType: "borrowed",
  personName: "John Smith",
  principal: 1000,
  accountId: "account-uuid",
  frequency: "monthly",
  installmentAmount: 100,
  startDate: "2026-01-18",
  createTransaction: true,
  categoryId: "category-uuid"
};

await createDebt(debt);
```

### Create Lent Debt
```javascript
const debt = {
  name: "Personal loan to friend",
  debtType: "lent",
  personName: "Jane Doe",
  principal: 500,
  accountId: "account-uuid",
  frequency: "monthly",
  installmentAmount: 50,
  startDate: "2026-01-18",
  createTransaction: true,
  categoryId: "category-uuid"
};

await createDebt(debt);
```

### Pay Installment with Transaction
```javascript
await payInstallment(debtId, true, categoryId);
```

## Backward Compatibility

All existing institutional debts will continue to work without any changes. The migration sets default `debtType` to 'institutional' for all existing records.

## Testing Checklist

- [ ] Existing institutional debts still display and function correctly
- [ ] Can create borrowed debt with transaction
- [ ] Can create lent debt with transaction
- [ ] Person name suggestions work
- [ ] Can filter debts by type
- [ ] Can pay installment with/without transaction creation
- [ ] Transaction type is correct (income for lent, expense for borrowed)
- [ ] Person names are saved and suggested for future use

## Rollback

To rollback the migration:

```bash
cd ledgerly-api
npm run migration:revert
```

Or execute the SQL commands from the migration's `down()` method.
