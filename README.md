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

## Where to Look for More

- Backend: `ledgerly-api/README.md`
- Frontend: `ledgerly_app/README.md`
- For architecture, workflow, and troubleshooting, see `.github/copilot-instructions.md`.

---

## Questions?

If you need more details on migrations, authentication, or frontend/backend patterns, check the key files above or open an issue.

