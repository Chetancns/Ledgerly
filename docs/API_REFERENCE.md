# Ledgerly API Reference

## Base URL
```
Development: http://192.168.1.50:3001
Production: Configure via NEXT_PUBLIC_API_BASE_URL
```

## Authentication

All authenticated endpoints require a valid JWT token in HTTP-only cookies. The token is automatically included when using the configured Axios client.

### Headers
```
Authorization: Bearer <token> (if not using cookies)
X-CSRF-Token: <csrf-token> (for POST/PUT/PATCH/DELETE)
Content-Type: application/json
```

---

## Authentication Endpoints

### POST /auth/register
Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "name": "John Doe"
}
```

**Response (200):**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "currency": "USD",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Cookies Set:**
- `accessToken`: JWT token (15 min expiry)
- `refreshToken`: Refresh token (7 day expiry)

---

### POST /auth/login
Authenticate an existing user.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response (200):**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "currency": "USD"
  }
}
```

**Cookies Set:**
- `accessToken`: JWT token (15 min expiry)
- `refreshToken`: Refresh token (7 day expiry)

**Errors:**
- `401`: Invalid credentials

---

### POST /auth/refresh
Refresh access token using refresh token.

**Request:** No body required (uses refreshToken cookie)

**Response (200):**
```json
{
  "accessToken": "new-jwt-token"
}
```

**Cookies Set:**
- `accessToken`: New JWT token
- `refreshToken`: New refresh token

**Errors:**
- `401`: Invalid or expired refresh token

---

### GET /auth/me
Get current authenticated user information.

**Authentication:** Required

**Response (200):**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "currency": "USD"
  }
}
```

---

### POST /auth/logout
Logout current user and clear tokens.

**Response (200):**
```json
{
  "message": "Logged out"
}
```

**Cookies Cleared:**
- `accessToken`
- `refreshToken`

---

### GET /auth/csrf-token
Get CSRF token for state-changing operations.

**Response (200):**
```json
{
  "csrfToken": "csrf-token-value"
}
```

---

## Account Endpoints

### GET /accounts
Get all accounts for authenticated user.

**Authentication:** Required

**Response (200):**
```json
[
  {
    "id": "uuid",
    "name": "Checking Account",
    "type": "checking",
    "balance": "1500.00",
    "currency": "USD",
    "userId": "uuid",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
]
```

---

### POST /accounts
Create a new account.

**Authentication:** Required

**Request Body:**
```json
{
  "name": "Savings Account",
  "type": "savings",
  "balance": "5000.00",
  "currency": "USD"
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "name": "Savings Account",
  "type": "savings",
  "balance": "5000.00",
  "currency": "USD",
  "userId": "uuid",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

---

### GET /accounts/:id
Get a specific account by ID.

**Authentication:** Required

**Response (200):**
```json
{
  "id": "uuid",
  "name": "Checking Account",
  "type": "checking",
  "balance": "1500.00",
  "currency": "USD",
  "userId": "uuid",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

**Errors:**
- `404`: Account not found

---

### PATCH /accounts/:id
Update an existing account.

**Authentication:** Required

**Request Body:**
```json
{
  "name": "Updated Account Name",
  "balance": "2000.00"
}
```

**Response (200):**
```json
{
  "id": "uuid",
  "name": "Updated Account Name",
  "type": "checking",
  "balance": "2000.00",
  "currency": "USD",
  "userId": "uuid"
}
```

---

### DELETE /accounts/:id
Delete an account.

**Authentication:** Required

**Response (200):**
```json
{
  "message": "Account deleted successfully"
}
```

---

## Transaction Endpoints

### GET /transactions
Get all transactions for authenticated user.

**Authentication:** Required

**Query Parameters:**
- `startDate` (optional): ISO date string
- `endDate` (optional): ISO date string
- `categoryId` (optional): UUID
- `accountId` (optional): UUID
- `type` (optional): expense | income | savings | transfer

**Response (200):**
```json
[
  {
    "id": "uuid",
    "userId": "uuid",
    "accountId": "uuid",
    "categoryId": "uuid",
    "amount": "50.00",
    "type": "expense",
    "description": "Grocery shopping",
    "transactionDate": "2024-01-15",
    "toAccountId": null,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "account": {
      "id": "uuid",
      "name": "Checking Account"
    },
    "category": {
      "id": "uuid",
      "name": "Groceries"
    }
  }
]
```

---

### POST /transactions
Create a new transaction.

**Authentication:** Required

**Request Body:**
```json
{
  "accountId": "uuid",
  "categoryId": "uuid",
  "amount": "50.00",
  "type": "expense",
  "description": "Grocery shopping",
  "transactionDate": "2024-01-15",
  "toAccountId": null
}
```

**For transfers, include:**
```json
{
  "accountId": "uuid-from-account",
  "toAccountId": "uuid-to-account",
  "amount": "100.00",
  "type": "transfer",
  "description": "Transfer between accounts",
  "transactionDate": "2024-01-15"
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "userId": "uuid",
  "accountId": "uuid",
  "categoryId": "uuid",
  "amount": "50.00",
  "type": "expense",
  "description": "Grocery shopping",
  "transactionDate": "2024-01-15",
  "createdAt": "2024-01-15T10:30:00.000Z"
}
```

---

### GET /transactions/:id
Get a specific transaction.

**Authentication:** Required

**Response (200):**
```json
{
  "id": "uuid",
  "userId": "uuid",
  "accountId": "uuid",
  "categoryId": "uuid",
  "amount": "50.00",
  "type": "expense",
  "description": "Grocery shopping",
  "transactionDate": "2024-01-15",
  "account": { ... },
  "category": { ... }
}
```

---

### PATCH /transactions/:id
Update an existing transaction.

**Authentication:** Required

**Request Body:**
```json
{
  "amount": "55.00",
  "description": "Updated description"
}
```

**Response (200):**
```json
{
  "id": "uuid",
  "amount": "55.00",
  "description": "Updated description",
  ...
}
```

---

### DELETE /transactions/:id
Delete a transaction.

**Authentication:** Required

**Response (200):**
```json
{
  "message": "Transaction deleted successfully"
}
```

---

## Category Endpoints

### GET /categories
Get all categories for authenticated user.

**Authentication:** Required

**Response (200):**
```json
[
  {
    "id": "uuid",
    "name": "Groceries",
    "type": "expense",
    "userId": "uuid",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
]
```

---

### POST /categories
Create a new category.

**Authentication:** Required

**Request Body:**
```json
{
  "name": "Entertainment",
  "type": "expense"
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "name": "Entertainment",
  "type": "expense",
  "userId": "uuid",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

---

### PATCH /categories/:id
Update a category.

**Authentication:** Required

**Request Body:**
```json
{
  "name": "Updated Category Name"
}
```

**Response (200):**
```json
{
  "id": "uuid",
  "name": "Updated Category Name",
  "type": "expense"
}
```

---

### DELETE /categories/:id
Delete a category.

**Authentication:** Required

**Response (200):**
```json
{
  "message": "Category deleted successfully"
}
```

---

## Budget Endpoints

### GET /budgets
Get all budgets for authenticated user.

**Authentication:** Required

**Query Parameters:**
- `period` (optional): monthly | weekly | bi-weekly | yearly
- `categoryId` (optional): UUID

**Response (200):**
```json
[
  {
    "id": "uuid",
    "userId": "uuid",
    "categoryId": "uuid",
    "amount": "500.00",
    "period": "monthly",
    "startDate": "2024-01-01",
    "endDate": "2024-01-31",
    "carriedOver": false,
    "category": {
      "id": "uuid",
      "name": "Groceries"
    }
  }
]
```

---

### POST /budgets
Create a new budget.

**Authentication:** Required

**Request Body:**
```json
{
  "categoryId": "uuid",
  "amount": "500.00",
  "period": "monthly",
  "startDate": "2024-01-01",
  "endDate": "2024-01-31"
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "userId": "uuid",
  "categoryId": "uuid",
  "amount": "500.00",
  "period": "monthly",
  "startDate": "2024-01-01",
  "endDate": "2024-01-31",
  "carriedOver": false
}
```

---

### GET /budgets/:id
Get a specific budget.

**Authentication:** Required

**Response (200):**
```json
{
  "id": "uuid",
  "userId": "uuid",
  "categoryId": "uuid",
  "amount": "500.00",
  "period": "monthly",
  "category": { ... }
}
```

---

### PATCH /budgets/:id
Update a budget.

**Authentication:** Required

**Request Body:**
```json
{
  "amount": "600.00"
}
```

**Response (200):**
```json
{
  "id": "uuid",
  "amount": "600.00",
  ...
}
```

---

### DELETE /budgets/:id
Delete a budget.

**Authentication:** Required

**Response (200):**
```json
{
  "message": "Budget deleted successfully"
}
```

---

## Debt Endpoints

### GET /debts
Get all debts for authenticated user.

**Authentication:** Required

**Response (200):**
```json
[
  {
    "id": "uuid",
    "userId": "uuid",
    "name": "Credit Card",
    "amount": "5000.00",
    "interestRate": "15.99",
    "dueDate": "2024-12-31",
    "updates": [
      {
        "id": "uuid",
        "amount": "500.00",
        "date": "2024-01-15",
        "note": "Monthly payment"
      }
    ]
  }
]
```

---

### POST /debts
Create a new debt.

**Authentication:** Required

**Request Body:**
```json
{
  "name": "Student Loan",
  "amount": "10000.00",
  "interestRate": "5.5",
  "dueDate": "2025-12-31"
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "userId": "uuid",
  "name": "Student Loan",
  "amount": "10000.00",
  "interestRate": "5.5",
  "dueDate": "2025-12-31"
}
```

---

### PATCH /debts/:id
Update a debt.

**Authentication:** Required

**Request Body:**
```json
{
  "amount": "9500.00"
}
```

**Response (200):**
```json
{
  "id": "uuid",
  "amount": "9500.00",
  ...
}
```

---

### DELETE /debts/:id
Delete a debt.

**Authentication:** Required

**Response (200):**
```json
{
  "message": "Debt deleted successfully"
}
```

---

## Recurring Transaction Endpoints

### GET /recurring
Get all recurring transactions for authenticated user.

**Authentication:** Required

**Response (200):**
```json
[
  {
    "id": "uuid",
    "userId": "uuid",
    "accountId": "uuid",
    "categoryId": "uuid",
    "amount": "100.00",
    "type": "expense",
    "description": "Netflix subscription",
    "frequency": "monthly",
    "nextDate": "2024-02-01",
    "active": true
  }
]
```

---

### POST /recurring
Create a new recurring transaction.

**Authentication:** Required

**Request Body:**
```json
{
  "accountId": "uuid",
  "categoryId": "uuid",
  "amount": "100.00",
  "type": "expense",
  "description": "Netflix subscription",
  "frequency": "monthly",
  "nextDate": "2024-02-01"
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "userId": "uuid",
  "accountId": "uuid",
  "categoryId": "uuid",
  "amount": "100.00",
  "type": "expense",
  "description": "Netflix subscription",
  "frequency": "monthly",
  "nextDate": "2024-02-01",
  "active": true
}
```

---

### PATCH /recurring/:id
Update a recurring transaction.

**Authentication:** Required

**Request Body:**
```json
{
  "amount": "120.00",
  "active": false
}
```

**Response (200):**
```json
{
  "id": "uuid",
  "amount": "120.00",
  "active": false,
  ...
}
```

---

### DELETE /recurring/:id
Delete a recurring transaction.

**Authentication:** Required

**Response (200):**
```json
{
  "message": "Recurring transaction deleted successfully"
}
```

---

## Reports Endpoints

### GET /reports/summary
Get financial summary report.

**Authentication:** Required

**Query Parameters:**
- `startDate`: ISO date string (required)
- `endDate`: ISO date string (required)

**Response (200):**
```json
{
  "totalIncome": "5000.00",
  "totalExpenses": "3000.00",
  "netSavings": "2000.00",
  "categoryBreakdown": [
    {
      "categoryId": "uuid",
      "categoryName": "Groceries",
      "total": "500.00"
    }
  ],
  "accountBalances": [
    {
      "accountId": "uuid",
      "accountName": "Checking",
      "balance": "2500.00"
    }
  ]
}
```

---

### GET /reports/category-spending
Get spending by category.

**Authentication:** Required

**Query Parameters:**
- `startDate`: ISO date string (required)
- `endDate`: ISO date string (required)

**Response (200):**
```json
[
  {
    "categoryId": "uuid",
    "categoryName": "Groceries",
    "total": "500.00",
    "transactionCount": 15
  }
]
```

---

### GET /reports/monthly-trends
Get monthly spending trends.

**Authentication:** Required

**Query Parameters:**
- `months`: Number of months (default: 6)

**Response (200):**
```json
[
  {
    "month": "2024-01",
    "income": "5000.00",
    "expenses": "3000.00",
    "savings": "2000.00"
  }
]
```

---

## AI Endpoints

### POST /ai/parse-transaction
Parse transaction from natural language text.

**Authentication:** Required

**Request Body:**
```json
{
  "text": "Spent $50 at Whole Foods for groceries yesterday"
}
```

**Response (200):**
```json
{
  "amount": "50.00",
  "type": "expense",
  "description": "Whole Foods - groceries",
  "transactionDate": "2024-01-14",
  "suggestedCategory": "Groceries"
}
```

---

### POST /ai/image
Parse transaction from receipt image.

**Authentication:** Required

**Content-Type:** multipart/form-data

**Request Body:**
- `file`: Image file (JPEG, PNG)

**Response (200):**
```json
{
  "amount": "45.67",
  "type": "expense",
  "description": "Target - receipt items",
  "transactionDate": "2024-01-15",
  "merchant": "Target",
  "items": [
    {
      "name": "Item 1",
      "price": "10.00"
    }
  ]
}
```

---

### POST /ai/audio
Parse transaction from voice recording.

**Authentication:** Required

**Content-Type:** multipart/form-data

**Request Body:**
- `file`: Audio file (MP3, WAV, M4A)

**Response (200):**
```json
{
  "transcription": "I spent fifty dollars at the grocery store",
  "parsedTransaction": {
    "amount": "50.00",
    "type": "expense",
    "description": "Grocery store",
    "suggestedCategory": "Groceries"
  }
}
```

---

## Error Responses

All endpoints may return the following error responses:

### 400 Bad Request
```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request"
}
```

### 401 Unauthorized
```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Unauthorized"
}
```

### 403 Forbidden
```json
{
  "statusCode": 403,
  "message": "Forbidden resource",
  "error": "Forbidden"
}
```

### 404 Not Found
```json
{
  "statusCode": 404,
  "message": "Resource not found",
  "error": "Not Found"
}
```

### 500 Internal Server Error
```json
{
  "statusCode": 500,
  "message": "Internal server error",
  "error": "Internal Server Error"
}
```

---

## Rate Limiting

⚠️ **IMPORTANT SECURITY NOTICE**: Currently, there is no rate limiting implemented. **This must be added before production deployment** to prevent:
- Brute force attacks on authentication endpoints
- API abuse and excessive costs (especially AI endpoints)
- Denial of service attacks

**Recommended Implementation:**

Use a package like `express-rate-limit` or `@nestjs/throttler`:

```typescript
// Example with @nestjs/throttler
import { ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [
    ThrottlerModule.forRoot({
      ttl: 60,
      limit: 100,
    }),
  ],
})
```

**Recommended limits:**
- **Authentication endpoints**: 5 requests per minute (prevent brute force)
- **Regular endpoints**: 100 requests per minute (prevent abuse)
- **AI endpoints**: 10 requests per minute (due to API costs and processing time)
- **Public endpoints**: 20 requests per minute (if any exist)

---

## Pagination

Most list endpoints do not currently implement pagination. For future upgrades, implement:

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 50, max: 100)

**Response Format:**
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 150,
    "pages": 3
  }
}
```
