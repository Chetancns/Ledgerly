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
- **Purpose**: Handles user authentication, JWT token signing, CSRF protection, and login/logout flows.
- **Key Files**:
  - `auth.controller.ts`: Login, register, refresh, logout, `/csrf-token` endpoints
  - `auth.service.ts`: Authentication business logic, token generation/validation
  - `jwt.strategy.ts`: JWT validation strategy
  - `jwt.guard.ts`: Route protection guard
- **Features**:
  - JWT-based authentication with HTTP-only cookies
  - Refresh token rotation (15m access / 7d refresh)
  - CSRF token issuance and rotation (see csrf.middleware)
  - Throttling on register/login (5 req/min)
  - Get current user via `/auth/me` (also rotates CSRF on GET)

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
- `index.tsx`: Dashboard/home page with summary and quick-access FAB
- `login.tsx`: User login with email/password
- `signup.tsx`: User registration
- `transactions.tsx`: Transaction management (list, filter, add via form or AI)
- `accounts.tsx`: Account management (bank, credit, cash, investments)
- `budgets.tsx`: Budget planning and category allocation
- `categories.tsx`: Transaction category management (expense/income types)
- `debts.tsx`: Debt tracking with payment history
- `recurring.tsx`: Recurring transaction templates
- `calendar.tsx`: Calendar view of transactions
- `insights.tsx`: Analytics and spending trends
- `profile.tsx`: User profile and settings
- `help.tsx`: Help and documentation links

#### Components (`src/components/`)
- `Layout.tsx`: **Global wrapper** with:
  - Desktop navbar (Dashboard + Transactions + all nav items)
  - Transactions dropdown (opens recurring submenu)
  - Mobile top header (user, notifications, logout)
  - Mobile bottom nav with "More" modal (3-col grid + recurring section)
  - Expandable FAB for adding transactions (receipt upload, audio record, manual entry)
  - Onboarding modal
- `TransactionForm.tsx`: Form for adding/editing transactions
- `UploadReceipt.tsx`: Receipt image upload with drag-drop
- `UploadAudio.tsx`: Voice recording for transactions
- `DebtForm.tsx`, `DebtList.tsx`: Debt UI
- `Chart.tsx`: Data visualization
- `NotificationCenter.tsx`: Budget/debt/recurring alerts
- `ThemeToggle.tsx`: Dark/light mode
- `AiInput.tsx`: Chat-like AI interface (if present)
- `Loading.tsx`, `Skeleton.tsx`: Loading states
- `DevWarningBanner.tsx`: Dev environment indicator
- `NeumorphicButton.tsx`, `NeumorphicInput.tsx`, `NeumorphicSelect.tsx`: Custom UI components

#### Services (`src/services/`)
- `api.ts`: **Base Axios client** with:
  - `withCredentials: true` for cookies
  - Request interceptor: calls `initCsrf` before POST/PUT/PATCH/DELETE
  - Response interceptor: 401 triggers `/auth/refresh` and retry; failed refresh clears state and redirects
- `auth.ts`: Auth API calls (login, signup, logout, `initCsrf` to fetch `/auth/csrf-token`)
- `transactions.ts`, `accounts.ts`, `budget.ts`, `debts.ts`, `recurring.ts`, `reports.ts`: CRUD and domain-specific calls
- `ai.ts`: AI endpoints (`uploadReceiptImage`, `uploadAudioFile`, parse functions)

#### Hooks (`src/hooks/`)
- `useAuth.ts`: Manages current user, login, signup, logout (calls `/auth/me` on mount)
- `useAuthRedirect.ts`: Auto-redirects unauthenticated users to `/login`
- `useNotificationTriggers.ts`: Polls for budget/debt/recurring alerts
- `useCurrencyFormatter.ts`: Format amounts by user's currency
- `useOnboardingKeyboard.ts`: Keyboard nav for onboarding steps

## Data Flow

### Authentication Flow
```
1. User submits login credentials
2. Frontend (axios withCredentials) sends POST to /auth/login
3. Backend validates credentials and sets httpOnly access + refresh cookies
4. CSRF middleware rotates `XSRF-TOKEN` on every GET; GET /auth/csrf-token returns the current token
5. Frontend request interceptor calls `initCsrf` before POST/PUT/PATCH/DELETE and attaches `X-CSRF-Token`
6. Subsequent requests rely on cookies (no Authorization header/localStorage tokens)
7. Backend validates JWT on protected routes
8. 401 triggers /auth/refresh; cookies are rotated
9. Failed refresh clears client state and redirects to /login
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

### Authentication & Token Management
- **Access Token**: JWT signed with `JWT_SECRET`, expires in 15 minutes, stored in HTTP-only `accessToken` cookie
- **Refresh Token**: JWT with 7-day expiry, stored in HTTP-only `refreshToken` cookie; rotated on `/auth/refresh`
- **Token Validation**: `jwt.guard.ts` validates on protected routes; `jwt.strategy.ts` extracts claims
- **Cookie Flags** (Production):
  - `httpOnly: true` (prevents XSS theft)
  - `secure: true` (HTTPS only)
  - `sameSite: 'none'` (allows cross-origin if needed; production must set correct origins)

### CSRF Protection
- **Middleware**: `src/middlewares/csrf.middleware.ts` runs on all requests
  - **GET requests**: Proactively rotate `XSRF-TOKEN` cookie (no validation needed)
  - **Unsafe methods** (POST/PUT/PATCH/DELETE): Validate `X-CSRF-Token` header against `XSRF-TOKEN` cookie
- **Frontend Flow**: `api.ts` request interceptor calls `initCsrf()` (GET `/auth/csrf-token`) before unsafe requests
- **Token Lifecycle**: 24-hour max age; rotated on every GET to prevent stale tokens in long-idle tabs

### Authorization
- **Route-level Guards**: `@UseGuards(JwtAuthGuard)` on protected endpoints
- **User-specific Filtering**: Queries include `WHERE userId = <jwt.sub>` to isolate data
- **Cascade Deletes**: Related records (accounts, transactions, etc.) deleted when user is deleted

### Data Security
- **Password Hashing**: Bcrypt (verified in entity but never returned)
- **Refresh Token Hash**: Stored hashed; validated during rotation
- **Database SSL**: Configurable via `DB_SSL` env; recommended in production
- **Parameterized Queries**: TypeORM handles SQL injection prevention

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
