# Database Schema Documentation

## Overview

Ledgerly uses PostgreSQL as its database with TypeORM as the ORM. The schema is organized under the `dbo` schema namespace.

## Entity Relationship Diagram

```
┌─────────────────┐
│     users       │
│─────────────────│
│ id (PK, UUID)   │
│ name            │
│ email (UNIQUE)  │◄──────────┐
│ passwordHash    │           │
│ refreshTokenHash│           │
│ currency        │           │
│ createdAt       │           │
│ updatedAt       │           │
└────────┬────────┘           │
         │                    │
         │ 1:N                │
         ├────────────────────┼────────────────┐
         │                    │                │
┌────────▼────────┐  ┌────────┴────────┐  ┌───▼──────────┐
│   accounts      │  │   categories    │  │ transactions │
│─────────────────│  │─────────────────│  │──────────────│
│ id (PK, UUID)   │  │ id (PK, UUID)   │  │ id (PK)      │
│ userId (FK)     │  │ userId (FK)     │  │ userId (FK)  │
│ name            │  │ name            │  │ accountId(FK)│◄──┐
│ type            │  │ type            │  │ categoryId   │◄──┤
│ balance         │  │ createdAt       │  │ amount       │   │
│ currency        │  └─────────────────┘  │ type         │   │
│ createdAt       │           │           │ description  │   │
└─────────────────┘           │           │ transDate    │   │
         │                    │           │ toAccountId  │   │
         │                    │           │ createdAt    │   │
         │                    │           └──────────────┘   │
         │                    │                              │
┌────────▼────────┐  ┌────────▼────────┐                   │
│    budgets      │  │    debts        │                   │
│─────────────────│  │─────────────────│                   │
│ id (PK, UUID)   │  │ id (PK, UUID)   │                   │
│ userId (FK)     │  │ userId (FK)     │                   │
│ categoryId (FK) │──┘ name            │                   │
│ amount          │    amount          │                   │
│ period          │    interestRate    │                   │
│ startDate       │    dueDate         │                   │
│ endDate         │    createdAt       │                   │
│ carriedOver     │    └────┬──────────┘                   │
│ sourceBudgetId  │         │ 1:N                          │
│ createdAt       │    ┌────▼──────────┐                   │
└─────────────────┘    │ debt_updates  │                   │
         │             │───────────────│                   │
         │             │ id (PK, UUID) │                   │
┌────────▼────────┐    │ debtId (FK)   │                   │
│   recurring     │    │ transactionId │───────────────────┘
│─────────────────│    │ amount        │
│ id (PK, UUID)   │    │ date          │
│ userId (FK)     │    │ note          │
│ accountId (FK)  │    │ createdAt     │
│ categoryId (FK) │    └───────────────┘
│ amount          │
│ type            │
│ description     │
│ frequency       │
│ nextDate        │
│ active          │
│ createdAt       │
└─────────────────┘
```

## Table Definitions

### users

Primary user account table storing authentication and profile information.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique user identifier |
| name | VARCHAR(100) | NULLABLE | User's display name |
| email | VARCHAR(150) | NOT NULL, UNIQUE | User's email address (login) |
| passwordHash | TEXT | NOT NULL | Bcrypt hashed password |
| refreshTokenHash | TEXT | NULLABLE | Hashed refresh token |
| currency | VARCHAR(10) | DEFAULT 'USD' | User's preferred currency |
| createdAt | TIMESTAMP | NOT NULL | Account creation timestamp |
| updatedAt | TIMESTAMP | NOT NULL | Last update timestamp |

**Indexes:**
- PRIMARY KEY on `id`
- UNIQUE INDEX on `email`

**Relations:**
- One-to-many with `accounts`
- One-to-many with `categories`
- One-to-many with `transactions`
- One-to-many with `budgets`
- One-to-many with `debts`
- One-to-many with `recurring`

---

### accounts

Financial accounts (bank accounts, credit cards, cash, investments).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique account identifier |
| userId | UUID | NOT NULL, FOREIGN KEY | Owner user ID |
| name | VARCHAR(100) | NOT NULL | Account name/label |
| type | VARCHAR(50) | NOT NULL | Account type (checking, savings, credit, cash) |
| balance | NUMERIC(12,2) | NOT NULL | Current account balance |
| currency | VARCHAR(10) | DEFAULT 'USD' | Account currency |
| createdAt | TIMESTAMP | NOT NULL | Account creation timestamp |
| updatedAt | TIMESTAMP | NOT NULL | Last update timestamp |

**Indexes:**
- PRIMARY KEY on `id`
- INDEX on `userId`

**Foreign Keys:**
- `userId` → `users.id` (CASCADE DELETE)

**Valid Types:**
- `checking`: Checking/current account
- `savings`: Savings account
- `credit`: Credit card
- `cash`: Cash on hand
- `investment`: Investment account
- `loan`: Loan account

---

### categories

Transaction categorization system.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique category identifier |
| userId | UUID | NOT NULL, FOREIGN KEY | Owner user ID |
| name | VARCHAR(100) | NOT NULL | Category name |
| type | VARCHAR(20) | NOT NULL | Category type (expense, income) |
| createdAt | TIMESTAMP | NOT NULL | Category creation timestamp |
| updatedAt | TIMESTAMP | NOT NULL | Last update timestamp |

**Indexes:**
- PRIMARY KEY on `id`
- INDEX on `userId`

**Foreign Keys:**
- `userId` → `users.id` (CASCADE DELETE)

**Valid Types:**
- `expense`: Expense category
- `income`: Income category

---

### transactions

Financial transaction records.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique transaction identifier |
| userId | UUID | NOT NULL, FOREIGN KEY | Owner user ID |
| accountId | UUID | NULLABLE, FOREIGN KEY | Source account |
| categoryId | UUID | NULLABLE, FOREIGN KEY | Transaction category |
| amount | NUMERIC(12,2) | NOT NULL | Transaction amount |
| type | VARCHAR(20) | NOT NULL | Transaction type |
| description | TEXT | NULLABLE | Transaction description/notes |
| transactionDate | DATE | NOT NULL | Date of transaction |
| toAccountId | UUID | NULLABLE | Target account (for transfers) |
| createdAt | TIMESTAMP | NOT NULL | Record creation timestamp |

**Indexes:**
- PRIMARY KEY on `id`
- INDEX on `userId`
- INDEX on `transactionDate`

**Foreign Keys:**
- `userId` → `users.id` (CASCADE DELETE)
- `accountId` → `accounts.id` (SET NULL)
- `categoryId` → `categories.id` (SET NULL)

**Valid Types:**
- `expense`: Money spent
- `income`: Money received
- `savings`: Transfer to savings
- `transfer`: Transfer between accounts

**Business Rules:**
- For `transfer` type, `toAccountId` must be set
- Amount should be positive
- TransactionDate should not be in future (recommended)

---

### budgets

Budget allocation and tracking.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique budget identifier |
| userId | UUID | NOT NULL, FOREIGN KEY | Owner user ID |
| categoryId | UUID | NULLABLE, FOREIGN KEY | Budget category |
| amount | NUMERIC(12,2) | NOT NULL | Budget amount limit |
| period | VARCHAR(20) | NOT NULL | Budget period type |
| startDate | DATE | NULLABLE | Budget start date |
| endDate | DATE | NULLABLE | Budget end date |
| carriedOver | BOOLEAN | DEFAULT FALSE | Whether budget carries over |
| sourceBudgetId | UUID | NULLABLE | Source budget if carried over |
| createdAt | TIMESTAMP | NOT NULL | Budget creation timestamp |

**Indexes:**
- PRIMARY KEY on `id`
- INDEX on `userId`

**Foreign Keys:**
- `userId` → `users.id` (CASCADE DELETE)
- `categoryId` → `categories.id` (SET NULL)

**Valid Periods:**
- `monthly`: Monthly budget
- `weekly`: Weekly budget
- `bi-weekly`: Bi-weekly budget
- `yearly`: Annual budget

**Business Rules:**
- If `carriedOver` is true, `sourceBudgetId` should reference the previous budget
- Date ranges should be consistent with period type

---

### debts

Debt tracking and management.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique debt identifier |
| userId | UUID | NOT NULL, FOREIGN KEY | Owner user ID |
| name | VARCHAR(200) | NOT NULL | Debt name/description |
| amount | NUMERIC(12,2) | NOT NULL | Current debt amount |
| originalAmount | NUMERIC(12,2) | NULLABLE | Original debt amount |
| interestRate | NUMERIC(5,2) | NULLABLE | Annual interest rate (%) |
| dueDate | DATE | NULLABLE | Debt due date |
| isPaidOff | BOOLEAN | DEFAULT FALSE | Whether debt is paid off |
| createdAt | TIMESTAMP | NOT NULL | Debt creation timestamp |
| updatedAt | TIMESTAMP | NOT NULL | Last update timestamp |

**Indexes:**
- PRIMARY KEY on `id`
- INDEX on `userId`

**Foreign Keys:**
- `userId` → `users.id` (CASCADE DELETE)

**Relations:**
- One-to-many with `debt_updates`

---

### debt_updates

Debt payment history tracking.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique update identifier |
| debtId | UUID | NOT NULL, FOREIGN KEY | Associated debt |
| transactionId | UUID | NULLABLE, FOREIGN KEY | Associated transaction |
| amount | NUMERIC(12,2) | NOT NULL | Payment amount |
| date | DATE | NOT NULL | Payment date |
| note | TEXT | NULLABLE | Payment notes |
| createdAt | TIMESTAMP | NOT NULL | Record creation timestamp |

**Indexes:**
- PRIMARY KEY on `id`
- INDEX on `debtId`

**Foreign Keys:**
- `debtId` → `debts.id` (CASCADE DELETE)
- `transactionId` → `transactions.id` (SET NULL)

**Business Rules:**
- Amount should be positive
- Each update reduces the parent debt amount

---

### recurring

Recurring/scheduled transaction templates.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique recurring identifier |
| userId | UUID | NOT NULL, FOREIGN KEY | Owner user ID |
| accountId | UUID | NULLABLE, FOREIGN KEY | Default account |
| categoryId | UUID | NULLABLE, FOREIGN KEY | Default category |
| amount | NUMERIC(12,2) | NOT NULL | Transaction amount |
| type | VARCHAR(20) | NOT NULL | Transaction type |
| description | TEXT | NULLABLE | Transaction description |
| frequency | VARCHAR(20) | NOT NULL | Recurrence frequency |
| nextDate | DATE | NOT NULL | Next scheduled date |
| active | BOOLEAN | DEFAULT TRUE | Whether recurring is active |
| createdAt | TIMESTAMP | NOT NULL | Record creation timestamp |
| updatedAt | TIMESTAMP | NOT NULL | Last update timestamp |

**Indexes:**
- PRIMARY KEY on `id`
- INDEX on `userId`
- INDEX on `nextDate`

**Foreign Keys:**
- `userId` → `users.id` (CASCADE DELETE)
- `accountId` → `accounts.id` (SET NULL)
- `categoryId` → `categories.id` (SET NULL)

**Valid Frequencies:**
- `daily`: Daily recurrence
- `weekly`: Weekly recurrence
- `bi-weekly`: Bi-weekly recurrence
- `monthly`: Monthly recurrence
- `quarterly`: Quarterly recurrence
- `yearly`: Annual recurrence

**Business Rules:**
- When a recurring transaction is executed, `nextDate` is updated based on frequency
- Inactive recurring transactions are not executed
- Amount should be positive

---

## Migration Strategy

### Current State
- Migrations stored in `ledgerly-api/src/migrations/`
- Migration configuration in `ledgerly-api/data-source.ts`
- Use TypeORM CLI for migration operations

### Commands
```bash
# Generate migration after entity changes
npm run migration:generate

# Run pending migrations
npm run migration:run

# Revert last migration
npm run migration:revert
```

### Best Practices
1. **Never use `synchronize: true` in production**
2. **Always generate migrations for schema changes**
3. **Test migrations on staging before production**
4. **Keep migrations in version control**
5. **Document breaking changes in migration files**

---

## Data Types

### Numeric Precision
- All monetary amounts use `NUMERIC(12,2)`
- This allows for values up to 9,999,999,999.99
- Precision ensures accurate financial calculations

### UUID vs Serial
- All primary keys use UUID for:
  - Better security (non-sequential)
  - Easier distributed systems
  - Merge-friendly across databases

### Date vs Timestamp
- `transactionDate` uses DATE (no time component)
- `createdAt/updatedAt` use TIMESTAMP (with time)
- All dates stored in UTC

---

## Indexes and Performance

### Current Indexes
1. **users.email**: Unique index for fast login lookup
2. **transactions.userId**: Query filtering by user
3. **transactions.transactionDate**: Date range queries
4. **accounts.userId**: User account lookup
5. **budgets.userId**: User budget lookup
6. **debts.userId**: User debt lookup

### Recommended Additional Indexes
```sql
-- For transaction filtering
CREATE INDEX idx_transactions_category ON transactions(categoryId) WHERE categoryId IS NOT NULL;
CREATE INDEX idx_transactions_account ON transactions(accountId) WHERE accountId IS NOT NULL;

-- For reports and analytics
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_user_date ON transactions(userId, transactionDate DESC);

-- For recurring transactions
CREATE INDEX idx_recurring_active_next ON recurring(active, nextDate) WHERE active = true;
```

---

## Data Integrity

### Cascade Deletes
- User deletion cascades to all related records
- Account/Category deletion sets related transaction fields to NULL
- Debt deletion cascades to debt_updates

### Null Handling
- Optional foreign keys (accountId, categoryId) can be NULL
- Allows transactions without specific account/category
- Nullable fields have clear business meaning

### Constraints
- Email uniqueness enforced at database level
- Amount fields constrained to 2 decimal places
- Type fields use CHECK constraints (via TypeORM enums)

---

## Query Patterns

### Common Queries

#### Get user's transaction summary
```sql
SELECT 
  t.type,
  COUNT(*) as count,
  SUM(t.amount) as total
FROM transactions t
WHERE t.userId = ?
  AND t.transactionDate BETWEEN ? AND ?
GROUP BY t.type;
```

#### Get category spending
```sql
SELECT 
  c.name,
  c.type,
  COUNT(t.id) as transaction_count,
  SUM(t.amount) as total_amount
FROM transactions t
JOIN categories c ON t.categoryId = c.id
WHERE t.userId = ?
  AND t.transactionDate BETWEEN ? AND ?
  AND t.type = 'expense'
GROUP BY c.id, c.name, c.type
ORDER BY total_amount DESC;
```

#### Get budget vs actual spending
```sql
SELECT 
  b.id as budget_id,
  c.name as category_name,
  b.amount as budget_amount,
  COALESCE(SUM(t.amount), 0) as actual_spending,
  b.amount - COALESCE(SUM(t.amount), 0) as remaining
FROM budgets b
LEFT JOIN categories c ON b.categoryId = c.id
LEFT JOIN transactions t ON t.categoryId = c.id 
  AND t.type = 'expense'
  AND t.transactionDate BETWEEN b.startDate AND b.endDate
WHERE b.userId = ?
GROUP BY b.id, c.name, b.amount;
```

---

## Backup and Recovery

### Backup Strategy
1. **Daily automated backups** of entire database
2. **Transaction log backups** every 6 hours
3. **Keep backups for 30 days**
4. **Test restore procedures monthly**

### Backup Commands
```bash
# Full database backup
pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME -f backup.sql

# Schema only backup
pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME --schema-only -f schema.sql

# Data only backup
pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME --data-only -f data.sql
```

### Restore Commands
```bash
# Restore full backup
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f backup.sql
```

---

## Schema Evolution

### Version History
- Initial schema created with TypeORM migrations
- Schema uses `dbo` namespace (unusual for PostgreSQL)
- All entities use UUID primary keys
- Timestamps use TypeORM decorators (@CreateDateColumn, @UpdateDateColumn)

### Planned Improvements
1. Add audit trail table for tracking changes
2. Implement soft deletes for important entities
3. Add more comprehensive indexing
4. Consider partitioning transactions table by date
5. Add database-level computed columns for common aggregations
6. Implement materialized views for reporting

---

## Security Considerations

### Sensitive Data
- Passwords are hashed (never stored plain text)
- Refresh tokens are hashed before storage
- No credit card numbers stored
- Financial data encrypted at rest (database level)

### Access Control
- All queries filtered by userId
- Row-level security ensures data isolation
- TypeORM queries use parameterized statements
- No dynamic SQL construction

### Compliance
- GDPR: User data can be exported/deleted
- Data retention: Consider archiving old transactions
- Audit trail: Should be implemented for compliance
