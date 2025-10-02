## Quick orientation for AI coding agents

This file documents the minimal, concrete knowledge an AI agent needs to be productive in Ledgerly — where code lives, how the pieces talk, and the exact commands and env vars used in practice.

Key facts
- The repo contains two main apps:
  - `ledgerly-api/` — NestJS backend (TypeScript + TypeORM). Entities and modules live under `ledgerly-api/src/*` (users, accounts, transactions, budgets, debts, AIChat, reports).
  - `ledgerly_app/` — Next.js frontend (TypeScript + React + Tailwind). Pages live under `ledgerly_app/src/pages` and UI components under `ledgerly_app/src/components` (see `Layout.tsx`).

Architecture & data flow (short)
- Frontend calls backend HTTP API. Example: frontend service `ledgerly_app/src/services/api.ts` sets axios baseURL to `http://192.168.1.50:3001` and `withCredentials: true`.
- Auth is JWT-based:
  - Backend endpoints: `POST /auth/register` and `POST /auth/login` (`ledgerly-api/src/auth/*`).
  - Backend signs tokens with `process.env.JWT_SECRET` and `process.env.JWT_EXPIRES` (see `ledgerly-api/src/auth/auth.service.ts`).
  - Frontend stores the `accessToken` in `localStorage` and injects it into the Authorization header via `ledgerly_app/src/services/api.ts`.
- Backend DB access uses TypeORM with migrations. Config lives in `ledgerly-api/data-source.ts` and `ledgerly-api/src/app.module.ts` (env-driven connection). Note: `synchronize: false` — use migrations for schema changes.

Concrete developer workflows (commands)
- Start backend in dev (PowerShell):
```powershell
cd ledgerly-api; npm install; npm run start:dev
```
- Run DB migrations (when you changed entities):
```powershell
cd ledgerly-api; npm run migration:generate  # generate
cd ledgerly-api; npm run migration:run       # apply
```
- Start frontend in dev (PowerShell):
```powershell
cd ledgerly_app; npm install; npm run dev
```
- Run backend tests:
```powershell
cd ledgerly-api; npm run test
```

Important env variables (search/define before running)
- DB_HOST, DB_PORT, DB_USER, DB_PASS, DB_NAME, DB_SSL — used by `data-source.ts` and `app.module.ts`.
- JWT_SECRET, JWT_EXPIRES — used for signing and validating tokens (`ledgerly-api/src/auth/*`).
- PORT — backend listen port (default fallback in `main.ts`).

Practical gotchas & conventions
- Default front-end axios baseURL points to `http://192.168.1.50:3001` in `ledgerly_app/src/services/api.ts`. Verify this matches backend `PORT` (or update the front-end baseURL) when running locally.
- CORS and dev origins: `ledgerly-api/src/main.ts` enables CORS for `http://localhost:3000` and `http://192.168.1.50:3000`; `ledgerly_app/next.config.ts` contains `allowedDevOrigins: ["http://192.168.1.50:3000"]`.
- TypeORM: the project uses migrations (see `ledgerly-api/src/migrations/` and `data-source.ts`). Do not set `synchronize: true` in production; follow migration workflow.
- Database schema: `data-source.ts` sets `schema: 'dbo'` (unusual for Postgres). Confirm your DB expects that or remove/adjust when necessary.
- Auth flow examples:
  - Register: `POST /auth/register` with { email, password, name } → returns `{ accessToken, user }`
  - Login: `POST /auth/login` with { email, password } → returns `{ accessToken, user }`
  - Frontend interceptor sets header `Authorization: Bearer <token>` from `localStorage.getItem('accessToken')`.

Where to look for answers (key files)
- Backend entry / DI: `ledgerly-api/src/main.ts`, `ledgerly-api/src/app.module.ts`.
- DB config / migrations: `ledgerly-api/data-source.ts`, `ledgerly-api/src/migrations/`.
- Auth: `ledgerly-api/src/auth/{auth.controller.ts,auth.service.ts,jwt.strategy.ts}`.
- Entities & modules: `ledgerly-api/src/{users,accounts,categories,transactions,budgets,debts,AIChat,reports}`.
- Frontend API callers: `ledgerly_app/src/services/*` (notable: `api.ts`, `auth.ts`, `transactions.ts`, `reports.ts`).
- Frontend UI patterns: `ledgerly_app/src/components/Layout.tsx` (global layout + localStorage-based user), pages under `ledgerly_app/src/pages`.

If you need to change behavior
- When updating API routes, run migration and update any front-end service using that route (grep `ledgerly_app/src/services` for usages).
- When changing JWT signing/validation, update `process.env` usage in `auth.service.ts` and `jwt.strategy.ts` and ensure env is present in dev/test.

If something isn't discoverable here
- Check `ledgerly-api/README.md` and `ledgerly_app/README.md` for high-level setup hints.
- If env file is missing, create one in `ledgerly-api/` with the variables listed above for local dev. Always verify `PORT` matches the front-end baseURL or update `ledgerly_app/src/services/api.ts`.

Questions or unclear sections? Reply which area you want expanded (e.g., migrations, auth token lifecycle, or common frontend edit patterns) and I'll iterate.
