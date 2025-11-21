# Ledgerly

Ledgerly is a full-stack personal finance management application, featuring a NestJS backend API and a Next.js React frontend. It supports user authentication, account and transaction tracking, budgeting, debt management, AI-powered chat, and reporting.

---

## Project Structure

- **ledgerly-api/** — NestJS backend (TypeScript + TypeORM)
  - Entities, modules, and business logic under `ledgerly-api/src/*`
- **ledgerly_app/** — Next.js frontend (TypeScript + React + Tailwind)
  - Pages under `ledgerly_app/src/pages`
  - UI components under `ledgerly_app/src/components`

---

## Backend: `ledgerly-api/`

### Stack

- [NestJS](https://nestjs.com/) (TypeScript)
- [TypeORM](https://typeorm.io/) (PostgreSQL)
- JWT-based authentication

### Setup

```powershell
cd ledgerly-api
npm install
npm run start:dev
```

### Database & Migrations

- Configure DB connection in `.env` (see below).
- **Migrations required for schema changes:**
  ```powershell
  npm run migration:generate  # generate migration after entity changes
  npm run migration:run       # apply migrations
  ```

### Authentication

- JWT tokens signed with `JWT_SECRET` and `JWT_EXPIRES` (from env).
- Endpoints:
  - `POST /auth/register` — `{ email, password, name }`
  - `POST /auth/login` — `{ email, password }`
- Returns `{ accessToken, user }` on success.

### Important Environment Variables

- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASS`, `DB_NAME`, `DB_SSL`
- `JWT_SECRET`, `JWT_EXPIRES`
- `PORT` (default: 3001)

### Key Files

- Entry: `ledgerly-api/src/main.ts`, `ledgerly-api/src/app.module.ts`
- DB config: `ledgerly-api/data-source.ts`
- Auth: `ledgerly-api/src/auth/*`
- Entities/Modules: `ledgerly-api/src/{users,accounts,transactions,budgets,debts,AIChat,reports}`

### Testing

```powershell
npm run test
```

---

## Frontend: `ledgerly_app/`

### Stack

- [Next.js](https://nextjs.org/) (TypeScript)
- [React](https://react.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Axios](https://axios-http.com/) for API calls

### Setup

```powershell
cd ledgerly_app
npm install
npm run dev
```

### API Usage

- API base URL: `http://192.168.1.50:3001` (see `ledgerly_app/src/services/api.ts`)
- Auth: JWT `accessToken` stored in `localStorage`, injected into `Authorization` header for API requests.

### Key Files

- API services: `ledgerly_app/src/services/{api.ts,auth.ts,transactions.ts,reports.ts}`
- UI: `ledgerly_app/src/components/Layout.tsx`
- Pages: `ledgerly_app/src/pages/*`

---

## Developer Workflow & Gotchas

- **Migrations:** Always run migrations after changing backend entities.
- **CORS:** Backend allows `http://localhost:3000` and `http://192.168.1.50:3000`.
- **Frontend API baseURL:** Ensure it matches backend `PORT` and host.
- **DB Schema:** Default schema is `'dbo'` in `data-source.ts` (adjust for your DB if needed).
- **Env Files:** Create `.env` in `ledgerly-api/` with required variables for local dev.

---

## Documentation

Comprehensive documentation is available in the `/docs` directory:

### Core Documentation
- **[Architecture Guide](docs/ARCHITECTURE.md)** - System architecture, technology stack, and design patterns
- **[API Reference](docs/API_REFERENCE.md)** - Complete API endpoint documentation with examples
- **[Database Schema](docs/DATABASE_SCHEMA.md)** - Database structure, relations, and migration guide
- **[Deployment Guide](docs/DEPLOYMENT.md)** - Step-by-step deployment instructions for various platforms

### Developer Resources
- **[Development Guide](docs/DEVELOPMENT.md)** - Setup, workflows, and best practices for developers
- **[Contributing Guide](docs/CONTRIBUTING.md)** - How to contribute to the project
- **[Troubleshooting Guide](docs/TROUBLESHOOTING.md)** - Common issues and solutions

### Quick Links
- Backend details: `ledgerly-api/README.md`
- Frontend details: `ledgerly_app/README.md`
- AI integration tips: See Architecture Guide

---

## Features

- 💰 **Transaction Management** - Track income, expenses, transfers, and savings
- 🏦 **Account Management** - Manage multiple accounts (checking, savings, credit cards, cash)
- 📊 **Budgeting** - Set and track budgets by category with multiple time periods
- 💳 **Debt Tracking** - Monitor debts and payment progress
- 🔄 **Recurring Transactions** - Automate regular transactions
- 📈 **Reports & Analytics** - Financial insights and spending trends
- 🤖 **AI-Powered Features**:
  - Natural language transaction parsing
  - Receipt image OCR and parsing
  - Voice transaction entry
- 🔐 **Secure Authentication** - JWT-based auth with refresh tokens
- 📱 **Responsive Design** - Works on desktop and mobile devices

---

## Quick Start

### Prerequisites
- Node.js 18.x or later
- PostgreSQL 14.x or later
- npm 9.x or later

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Chetancns/Ledgerly.git
   cd Ledgerly
   ```

2. **Setup database**
   ```bash
   createdb ledgerly_dev
   ```

3. **Configure backend**
   ```bash
   cd ledgerly-api
   cp .env.example .env  # Create and edit .env file
   npm install
   npm run migration:run
   ```

4. **Configure frontend**
   ```bash
   cd ../ledgerly_app
   cp .env.local.example .env.local  # Create and edit .env.local
   npm install
   ```

5. **Start development servers**
   
   **Option 1: Using batch file (Windows)**
   ```bash
   ./start-apps.bat
   ```
   
   **Option 2: Manual start**
   ```bash
   # Terminal 1 - Backend
   cd ledgerly-api
   npm run start:dev
   
   # Terminal 2 - Frontend
   cd ledgerly_app
   npm run dev
   ```

6. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001

For detailed setup instructions, see the [Development Guide](docs/DEVELOPMENT.md).

---

## Technology Stack

### Backend
- **Framework**: NestJS 10.x
- **Language**: TypeScript
- **Database**: PostgreSQL with TypeORM
- **Authentication**: JWT with refresh tokens
- **AI Integration**: OpenAI API (GPT & Whisper)

### Frontend
- **Framework**: Next.js 15.x
- **UI Library**: React 19.x
- **Styling**: Tailwind CSS
- **HTTP Client**: Axios
- **State Management**: React Hooks

---

## Contributing

We welcome contributions! Please see our [Contributing Guide](docs/CONTRIBUTING.md) for details on:
- Code of conduct
- Development workflow
- Coding standards
- Pull request process

---

## Support & Resources

- **Documentation**: See `/docs` directory
- **Issues**: [GitHub Issues](https://github.com/Chetancns/Ledgerly/issues)
- **Troubleshooting**: [Troubleshooting Guide](docs/TROUBLESHOOTING.md)

---

## License

This project is open source. Please check the repository for license details.

---

## Acknowledgments

Built with modern web technologies and best practices for personal finance management.

