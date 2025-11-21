# Troubleshooting Guide for Ledgerly

This guide helps you diagnose and resolve common issues when developing or running Ledgerly.

## Table of Contents

- [Installation Issues](#installation-issues)
- [Database Issues](#database-issues)
- [Backend Issues](#backend-issues)
- [Frontend Issues](#frontend-issues)
- [Authentication Issues](#authentication-issues)
- [Build & Deployment Issues](#build--deployment-issues)
- [Performance Issues](#performance-issues)
- [Common Error Messages](#common-error-messages)

---

## Installation Issues

### Node.js Version Mismatch

**Problem**: Build fails with version errors

**Symptoms**:
```
Error: The engine "node" is incompatible with this module
```

**Solution**:
```bash
# Check current version
node --version

# Should be 18.x or later
# Install correct version using nvm
nvm install 18
nvm use 18

# Verify
node --version
```

### npm Install Fails

**Problem**: Dependencies fail to install

**Symptoms**:
```
npm ERR! code ERESOLVE
npm ERR! ERESOLVE could not resolve
```

**Solution**:
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and package-lock.json
rm -rf node_modules package-lock.json

# Reinstall
npm install

# If still failing, try legacy peer deps
npm install --legacy-peer-deps
```

### Permission Errors (Linux/Mac)

**Problem**: EACCES permission errors

**Symptoms**:
```
Error: EACCES: permission denied
```

**Solution**:
```bash
# Fix npm permissions
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc

# Or use sudo (not recommended)
sudo npm install -g npm
```

---

## Database Issues

### Cannot Connect to Database

**Problem**: Backend fails to connect to PostgreSQL

**Symptoms**:
```
Error: connect ECONNREFUSED 127.0.0.1:5432
Connection terminated unexpectedly
```

**Solution**:

1. **Check if PostgreSQL is running**:
```bash
# Windows
services.msc  # Look for PostgreSQL service

# Linux
sudo systemctl status postgresql

# Mac
brew services list
```

2. **Start PostgreSQL if stopped**:
```bash
# Windows
net start postgresql-x64-14

# Linux
sudo systemctl start postgresql

# Mac
brew services start postgresql
```

3. **Verify connection details in .env**:
```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASS=your_password
DB_NAME=ledgerly_dev
```

4. **Test connection manually**:
```bash
psql -h localhost -U postgres -d ledgerly_dev
# Enter password when prompted
```

### Database Does Not Exist

**Problem**: Database not found

**Symptoms**:
```
error: database "ledgerly_dev" does not exist
```

**Solution**:
```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE ledgerly_dev;

# Create schema
\c ledgerly_dev
CREATE SCHEMA IF NOT EXISTS dbo;

# Exit
\q
```

### Migration Errors

**Problem**: Migrations fail to run

**Symptoms**:
```
QueryFailedError: relation "dbo.users" already exists
Migration failed
```

**Solution**:

1. **Check migration status**:
```bash
cd ledgerly-api
npm run migration:show
```

2. **Revert and rerun**:
```bash
npm run migration:revert
npm run migration:run
```

3. **Clean slate** (CAUTION: Deletes all data):
```bash
# Drop and recreate database
psql -U postgres -c "DROP DATABASE IF EXISTS ledgerly_dev;"
psql -U postgres -c "CREATE DATABASE ledgerly_dev;"

# Run migrations
npm run migration:run
```

### Schema Permission Issues

**Problem**: Permission denied on schema

**Symptoms**:
```
permission denied for schema dbo
```

**Solution**:
```sql
-- Connect as postgres user
psql -U postgres -d ledgerly_dev

-- Grant permissions
GRANT ALL ON SCHEMA dbo TO your_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA dbo TO your_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA dbo TO your_user;
```

---

## Backend Issues

### Port Already in Use

**Problem**: Backend won't start, port 3001 occupied

**Symptoms**:
```
Error: listen EADDRINUSE: address already in use :::3001
```

**Solution**:

**Windows**:
```powershell
# Find process on port 3001
netstat -ano | findstr :3001

# Kill process (replace PID)
taskkill /PID <PID> /F
```

**Linux/Mac**:
```bash
# Find process
lsof -i :3001

# Kill process
kill -9 <PID>
```

**Or change port in .env**:
```env
PORT=3002
```

### JWT Secret Not Set

**Problem**: Authentication fails

**Symptoms**:
```
Error: JWT_SECRET is not defined
```

**Solution**:

1. **Create/update .env file**:
```env
JWT_SECRET=your-secret-key-min-32-characters-long
JWT_EXPIRES=15m
```

2. **Restart backend**

### TypeORM Entity Not Found

**Problem**: Entity not registered

**Symptoms**:
```
EntityMetadataNotFoundError: No metadata for "Feature" was found
```

**Solution**:

1. **Check entity is in data-source.ts**:
```typescript
// data-source.ts
import { Feature } from './src/features/feature.entity';

entities: [
  User,
  Account,
  // ... other entities
  Feature  // Add your entity here
],
```

2. **Check entity is in app.module.ts**:
```typescript
// app.module.ts
TypeOrmModule.forFeature([
  User,
  Account,
  // ... other entities
  Feature  // Add your entity here
])
```

### Module Import Errors

**Problem**: Circular dependency or missing imports

**Symptoms**:
```
Error: Cannot resolve dependency
Nest can't resolve dependencies
```

**Solution**:

1. **Check imports in module**:
```typescript
@Module({
  imports: [
    TypeOrmModule.forFeature([Feature]),
    // Make sure all required modules are imported
  ],
  controllers: [FeatureController],
  providers: [FeatureService],
  exports: [FeatureService]  // Export if used by other modules
})
```

2. **Use forwardRef for circular dependencies**:
```typescript
@Module({
  imports: [forwardRef(() => OtherModule)],
})
```

---

## Frontend Issues

### API Connection Failed

**Problem**: Frontend cannot connect to backend

**Symptoms**:
```
Network Error
CORS error
ERR_CONNECTION_REFUSED
```

**Solution**:

1. **Verify backend is running**:
```bash
curl http://localhost:3001/health
```

2. **Check API base URL in .env.local**:
```env
NEXT_PUBLIC_API_BASE_URL=http://192.168.1.50:3001
```

3. **Verify CORS settings in backend**:
```typescript
// main.ts
app.enableCors({
  origin: ['http://localhost:3000', 'http://192.168.1.50:3000'],
  credentials: true
});
```

### CORS Errors

**Problem**: Cross-origin requests blocked

**Symptoms**:
```
Access to fetch has been blocked by CORS policy
```

**Solution**:

1. **Add frontend URL to CORS whitelist** (backend main.ts):
```typescript
app.enableCors({
  origin: [
    'http://localhost:3000',
    'http://192.168.1.50:3000',
    'https://yourdomain.com'  // Add your frontend URL
  ],
  credentials: true
});
```

2. **Ensure withCredentials is true** (frontend api.ts):
```typescript
const api = axios.create({
  baseURL: BASE,
  withCredentials: true  // Important!
});
```

### Page Not Found (404)

**Problem**: Next.js page returns 404

**Symptoms**:
```
404 - This page could not be found
```

**Solution**:

1. **Check file naming**:
   - Files must be in `src/pages/`
   - Files must have `.tsx` or `.jsx` extension
   - Use lowercase and hyphens for URLs

2. **Dynamic routes** need brackets:
   - `[id].tsx` for `/feature/123`
   - `[...slug].tsx` for catch-all

3. **Restart dev server**:
```bash
# Stop with Ctrl+C
npm run dev
```

### Build Errors

**Problem**: Frontend build fails

**Symptoms**:
```
Type error: Property 'x' does not exist
Module not found
```

**Solution**:

1. **Type errors**:
```typescript
// Add proper types
interface Props {
  x: string;
}

const Component: React.FC<Props> = ({ x }) => {
  // ...
};
```

2. **Missing modules**:
```bash
npm install missing-package
```

3. **Clear Next.js cache**:
```bash
rm -rf .next
npm run build
```

### Styling Issues

**Problem**: Tailwind classes not working

**Symptoms**:
- Classes have no effect
- Styles not applied

**Solution**:

1. **Check tailwind.config.js**:
```javascript
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx}',
    './src/components/**/*.{js,ts,jsx,tsx}',
  ],
  // ...
};
```

2. **Verify PostCSS config** (postcss.config.js):
```javascript
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

3. **Import Tailwind in index.css**:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

---

## Authentication Issues

### Infinite Redirect Loop

**Problem**: Login redirects continuously

**Symptoms**:
- Page keeps refreshing
- Never reaches dashboard

**Solution**:

1. **Check token refresh logic** (api.ts):
```typescript
// Ensure _retry flag prevents infinite loops
if (err.response?.status === 401 && !original._retry) {
  original._retry = true;
  // ... refresh logic
}
```

2. **Clear browser storage**:
```javascript
// In browser console
localStorage.clear();
sessionStorage.clear();
// Clear cookies
```

3. **Check authentication guard**:
```typescript
// Ensure redirect logic is correct
if (!user) {
  router.push('/login');
  return null;
}
```

### Token Expired Immediately

**Problem**: JWT expires right after login

**Symptoms**:
```
401 Unauthorized immediately after login
```

**Solution**:

1. **Check JWT expiry** (.env):
```env
JWT_EXPIRES=15m  # Not too short!
```

2. **Verify server time**:
```bash
# Time sync issues can cause immediate expiry
date
# Ensure system time is correct
```

3. **Check cookie settings**:
```typescript
// Ensure cookies are set correctly
res.cookie('accessToken', token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 1000 * 60 * 15  // 15 minutes
});
```

### CSRF Token Errors

**Problem**: CSRF validation fails

**Symptoms**:
```
CSRF token mismatch
Forbidden
```

**Solution**:

1. **Get CSRF token before requests**:
```typescript
// api.ts interceptor should handle this
const token = await initCsrf();
config.headers['X-CSRF-Token'] = token;
```

2. **Check cookie settings**:
```typescript
Cookies.set('XSRF-TOKEN', token, {
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production'
});
```

---

## Build & Deployment Issues

### Build Fails in Production

**Problem**: Production build errors

**Symptoms**:
```
Build failed
Type errors in production
```

**Solution**:

1. **Check TypeScript strict mode**:
```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true
  }
}
```

2. **Fix type errors**:
```bash
# Run type check
npm run type-check

# Fix all type errors
```

3. **Check environment variables**:
```bash
# Ensure all required env vars are set
# NEXT_PUBLIC_* vars are embedded at build time
```

### Out of Memory

**Problem**: Build runs out of memory

**Symptoms**:
```
FATAL ERROR: Reached heap limit
JavaScript heap out of memory
```

**Solution**:

1. **Increase Node memory**:
```bash
# In package.json scripts
"build": "node --max-old-space-size=4096 node_modules/.bin/next build"
```

2. **Or use environment variable**:
```bash
export NODE_OPTIONS="--max-old-space-size=4096"
npm run build
```

### Docker Build Issues

**Problem**: Docker build fails

**Symptoms**:
```
Error response from daemon
Build failed
```

**Solution**:

1. **Clear Docker cache**:
```bash
docker system prune -a
```

2. **Build with no cache**:
```bash
docker build --no-cache -t ledgerly-api .
```

3. **Check Dockerfile**:
```dockerfile
# Use specific Node version
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files first
COPY package*.json ./
RUN npm ci

# Then copy source
COPY . .
RUN npm run build
```

---

## Performance Issues

### Slow Database Queries

**Problem**: API responses are slow

**Solution**:

1. **Add database indexes**:
```sql
CREATE INDEX idx_transactions_user_date 
ON dbo.transactions(userId, transactionDate DESC);
```

2. **Optimize queries**:
```typescript
// Use select to limit fields
const transactions = await this.transactionRepo.find({
  where: { userId },
  select: ['id', 'amount', 'type', 'description'],
  order: { transactionDate: 'DESC' },
  take: 50  // Limit results
});
```

3. **Enable query logging**:
```typescript
// data-source.ts
{
  logging: true,  // See all queries
  logger: 'advanced-console'
}
```

### Memory Leaks

**Problem**: Application memory grows continuously

**Solution**:

1. **Check for unsubscribed observables**:
```typescript
// Use useEffect cleanup
useEffect(() => {
  const subscription = observable.subscribe();
  return () => subscription.unsubscribe();
}, []);
```

2. **Clear intervals/timeouts**:
```typescript
useEffect(() => {
  const interval = setInterval(() => {}, 1000);
  return () => clearInterval(interval);
}, []);
```

3. **Monitor memory**:
```bash
# PM2 monitoring
pm2 monit

# Node inspector
node --inspect dist/main.js
```

### Large Bundle Size

**Problem**: Frontend bundle is too large

**Solution**:

1. **Analyze bundle**:
```bash
npm run build
# Check .next/analyze
```

2. **Use dynamic imports**:
```typescript
// Instead of
import HeavyComponent from './HeavyComponent';

// Use
const HeavyComponent = dynamic(() => import('./HeavyComponent'));
```

3. **Remove unused dependencies**:
```bash
npm uninstall unused-package
```

---

## Common Error Messages

### "Cannot find module"

**Fix**:
```bash
npm install
# Or install specific package
npm install missing-package
```

### "Port already in use"

**Fix**:
```bash
# Kill process on port
# Windows: taskkill /PID <PID> /F
# Linux/Mac: kill -9 <PID>
```

### "ENOENT: no such file or directory"

**Fix**:
```bash
# Ensure file exists
ls -la path/to/file

# Create missing directories
mkdir -p path/to/directory
```

### "Permission denied"

**Fix**:
```bash
# Linux/Mac
chmod +x file
# Or run with sudo (not recommended for npm)
```

### "ECONNREFUSED"

**Fix**:
- Ensure server is running
- Check correct host and port
- Verify firewall settings

---

## Getting Additional Help

If you've tried these solutions and still have issues:

1. **Check existing GitHub issues**: Someone may have had the same problem
2. **Create a new issue**: Include:
   - Error message
   - Steps to reproduce
   - Your environment (OS, Node version, etc.)
   - Relevant logs
3. **Check documentation**: See `/docs` directory
4. **Review recent changes**: Use `git log` to see what changed

## Logs Location

- Backend development: Console output
- Backend production (PM2): `~/.pm2/logs/`
- Frontend development: Browser console
- Frontend production: Server logs
- Database: PostgreSQL log directory
- Nginx: `/var/log/nginx/`

## Debug Mode

Enable verbose logging:

**Backend**:
```env
LOG_LEVEL=debug
```

**Frontend**:
```typescript
// api.ts
console.log('Request:', config);
console.log('Response:', response);
```

**Database**:
```typescript
// data-source.ts
{
  logging: true,
  logger: 'advanced-console'
}
```
