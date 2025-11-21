# Ledgerly Architecture Documentation

## Overview

Ledgerly is a full-stack personal finance management application built with modern web technologies. The application follows a client-server architecture with clear separation between frontend and backend concerns.

## System Architecture

```
┌─────────────────────────────────────────┐
│         Frontend (Next.js)              │
│  - React Components                     │
│  - Pages & Routing                      │
│  - API Client Services                  │
│  - State Management                     │
└──────────────┬──────────────────────────┘
               │ HTTP/REST API
               │ (JWT Authentication)
┌──────────────▼──────────────────────────┐
│         Backend (NestJS)                │
│  - Controllers                          │
│  - Services (Business Logic)            │
│  - Guards & Middleware                  │
│  - TypeORM Entities                     │
└──────────────┬──────────────────────────┘
               │ TypeORM
               │
┌──────────────▼──────────────────────────┐
│      Database (PostgreSQL)              │
│  - Schema: dbo                          │
│  - Entities & Relations                 │
└─────────────────────────────────────────┘
```

## Technology Stack

### Backend
- **Framework**: NestJS 10.x
- **Language**: TypeScript
- **ORM**: TypeORM
- **Database**: PostgreSQL
- **Authentication**: JWT (JSON Web Tokens)
- **AI Integration**: OpenAI API

### Frontend
- **Framework**: Next.js 15.x
- **UI Library**: React 19.x
- **Styling**: Tailwind CSS
- **HTTP Client**: Axios
- **Cookie Management**: js-cookie

## Core Components

### Backend Modules

#### 1. Authentication Module (`src/auth/`)
- **Purpose**: Handles user authentication and authorization
- **Key Files**:
  - `auth.controller.ts`: Login, register, refresh, logout endpoints
  - `auth.service.ts`: Authentication business logic
  - `jwt.strategy.ts`: JWT validation strategy
  - `jwt.guard.ts`: Route protection guard
- **Features**:
  - JWT-based authentication
  - Refresh token rotation
  - CSRF protection
  - HTTP-only cookies for token storage

#### 2. Users Module (`src/users/`)
- **Purpose**: User management and profile operations
- **Entity**: `user.entity.ts`
- **Key Fields**: id (UUID), email, name, passwordHash, currency
- **Relations**: One-to-many with accounts, categories, transactions, budgets, debts

#### 3. Accounts Module (`src/accounts/`)
- **Purpose**: Financial account management (bank accounts, credit cards, cash)
- **Entity**: `account.entity.ts`
- **Operations**: Create, read, update, delete accounts
- **Features**: Track account types and balances

#### 4. Transactions Module (`src/transactions/`)
- **Purpose**: Financial transaction tracking
- **Entity**: `transaction.entity.ts`
- **Transaction Types**: expense, income, savings, transfer
- **Key Fields**: amount, type, description, transactionDate, category, account
- **Features**: 
  - Multi-account transfers
  - Category assignment
  - Date-based filtering

#### 5. Categories Module (`src/categories/`)
- **Purpose**: Transaction categorization system
- **Entity**: `category.entity.ts`
- **Features**: User-specific categories for expense tracking

#### 6. Budgets Module (`src/budgets/`)
- **Purpose**: Budget planning and tracking
- **Entity**: `budget.entity.ts`
- **Budget Periods**: monthly, weekly, bi-weekly, yearly
- **Features**:
  - Category-based budgets
  - Budget carryover
  - Date range filtering

#### 7. Debts Module (`src/debts/`)
- **Purpose**: Debt tracking and management
- **Entities**: 
  - `debt.entity.ts`: Main debt record
  - `debt-update.entity.ts`: Debt payment updates
- **Features**: Track debt amounts, payments, and progress

#### 8. Recurring Transactions Module (`src/recurring/`)
- **Purpose**: Automated recurring transaction management
- **Entity**: `recurring.entity.ts`
- **Features**: Schedule and automate regular transactions

#### 9. Reports Module (`src/reports/`)
- **Purpose**: Financial reporting and analytics
- **Controller**: `reports.controller.ts`
- **Features**: Generate financial summaries and insights

#### 10. AI Chat Module (`src/AIChat/`)
- **Purpose**: AI-powered financial assistant
- **Features**:
  - Natural language transaction parsing
  - Receipt image OCR and parsing
  - Voice transaction entry via audio parsing
- **Integrations**: OpenAI API for GPT and Whisper models

### Frontend Structure

#### Pages (`src/pages/`)
- `index.tsx`: Dashboard/home page
- `login.tsx`: User login
- `signup.tsx`: User registration
- `transactions.tsx`: Transaction management
- `accounts.tsx`: Account management
- `budgets.tsx`: Budget planning
- `categories.tsx`: Category management
- `debts.tsx`: Debt tracking
- `recurring.tsx`: Recurring transactions
- `help.tsx`: Help and documentation

#### Components (`src/components/`)
- `Layout.tsx`: Global layout wrapper with navigation
- `TransactionForm.tsx`: Form for adding/editing transactions
- `Chart.tsx`: Data visualization component
- `DebtForm.tsx`: Debt entry form
- `DebtList.tsx`: Debt display component
- `UploadReceipt.tsx`: Receipt image upload
- `UploadAudio.tsx`: Voice transaction entry
- `AiInput.tsx`: AI chat interface
- `DevWarningBanner.tsx`: Development environment indicator

#### Services (`src/services/`)
- `api.ts`: Base Axios configuration with interceptors
- `auth.ts`: Authentication API calls
- `transactions.ts`: Transaction API calls
- `accounts.ts`: Account API calls
- `category.ts`: Category API calls
- `budget.ts`: Budget API calls
- `debts.ts`: Debt API calls
- `recurring.ts`: Recurring transaction API calls
- `reports.ts`: Reports API calls
- `ai.ts`: AI service API calls

## Data Flow

### Authentication Flow
```
1. User submits login credentials
2. Frontend sends POST to /auth/login
3. Backend validates credentials
4. Backend generates JWT access & refresh tokens
5. Backend sets HTTP-only cookies
6. Frontend stores user data in localStorage
7. Subsequent requests include cookies automatically
8. Backend validates JWT on protected routes
9. Frontend refreshes tokens when expired
```

### Transaction Creation Flow
```
1. User fills out transaction form
2. Frontend validates input
3. Frontend sends POST to /transactions
4. Backend JWT guard validates authentication
5. Backend service validates business rules
6. Backend creates transaction via TypeORM
7. Database stores transaction with relations
8. Backend returns created transaction
9. Frontend updates UI
```

### AI Receipt Parsing Flow
```
1. User uploads receipt image
2. Frontend sends image to /ai/image
3. Backend receives file via Multer
4. Backend sends image to OpenAI Vision API
5. AI extracts transaction details
6. Backend returns parsed transaction data
7. Frontend pre-fills transaction form
8. User confirms and saves transaction
```

## Security Architecture

### Authentication
- JWT tokens with short expiration (15 minutes)
- Refresh tokens with longer expiration (7 days)
- HTTP-only cookies prevent XSS attacks
- Secure flag enabled in production
- Token rotation on refresh

### CSRF Protection
- CSRF tokens for state-changing operations
- Token validation in request interceptor
- Separate CSRF endpoint for token retrieval

### Authorization
- Route-level guards using `@UseGuards(JwtAuthGuard)`
- User-specific data filtering (userId in queries)
- Cascade deletes for data ownership

### Database Security
- SSL connections in production (configurable)
- Parameterized queries via TypeORM
- Password hashing (not visible in entities)

## Database Schema

### Core Tables
- `dbo.users`: User accounts
- `dbo.categories`: Transaction categories
- `dbo.accounts`: Financial accounts
- `dbo.transactions`: Financial transactions
- `dbo.budgets`: Budget allocations
- `dbo.debts`: Debt records
- `dbo.debt_updates`: Debt payment history
- `dbo.recurring_transactions`: Recurring transaction templates

### Key Relations
- User → Accounts (1:N)
- User → Categories (1:N)
- User → Transactions (1:N)
- User → Budgets (1:N)
- User → Debts (1:N)
- Transaction → Account (N:1)
- Transaction → Category (N:1)
- Budget → Category (N:1)
- Debt → DebtUpdates (1:N)

## Configuration

### Environment Variables

#### Backend (.env in ledgerly-api/)
```
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASS=password
DB_NAME=ledgerly
DB_SSL=false
JWT_SECRET=your-secret-key
JWT_EXPIRES=15m
PORT=3001
NODE_ENV=development
```

#### Frontend (.env.local in ledgerly_app/)
```
NEXT_PUBLIC_API_BASE_URL=http://192.168.1.50:3001
NODE_ENV=development
```

## Scalability Considerations

### Current Architecture
- Monolithic backend (NestJS)
- Stateless API (JWT-based)
- Direct database connections

### Future Improvements
- Add Redis for session/cache
- Implement rate limiting
- Add request queuing for AI operations
- Database connection pooling optimization
- Implement pagination consistently
- Add database indexing strategy
- Consider microservices for AI features

## Development Workflow

1. **Local Development**
   - Backend runs on port 3001
   - Frontend runs on port 3000
   - Direct database connection

2. **Database Migrations**
   - Generate migrations after entity changes
   - Run migrations before deployment
   - Never use synchronize in production

3. **Testing Strategy**
   - Minimal unit tests currently
   - Manual testing primary approach
   - Future: E2E tests recommended

## Performance Considerations

- Database queries use indexes on userId and transactionDate
- Eager loading configured for frequently accessed relations
- Frontend API calls use Axios interceptors for efficiency
- Token refresh handled automatically
- CORS configured for specific origins

## Monitoring & Logging

- Console logging in development
- HTTP request/response logging
- Authentication event logging
- Error logging in try-catch blocks
- Future: Implement structured logging

## API Versioning

Currently no versioning strategy. Recommended for future:
- URL-based versioning (/v1/, /v2/)
- Header-based versioning
- Deprecation warnings for old endpoints
