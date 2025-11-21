# Quick Reference Guide

Fast reference for common tasks and commands in Ledgerly development.

## 🚀 Quick Start

```bash
# Clone and setup
git clone https://github.com/Chetancns/Ledgerly.git
cd Ledgerly

# Setup database
createdb ledgerly_dev

# Backend setup
cd ledgerly-api
npm install
npm run migration:run
npm run start:dev

# Frontend setup (new terminal)
cd ../ledgerly_app
npm install
npm run dev

# Access at http://localhost:3000
```

## 📝 Common Commands

### Backend (ledgerly-api/)

```bash
# Development
npm run start:dev          # Start with hot reload
npm run start:debug        # Start with debugger

# Build & Production
npm run build              # Build for production
npm run start:prod         # Run production build

# Database
npm run migration:generate # Generate migration
npm run migration:run      # Run migrations
npm run migration:revert   # Revert last migration

# Testing & Quality
npm run test               # Run tests
npm run test:cov           # Test coverage
npm run lint               # Lint code
npm run format             # Format code
```

### Frontend (ledgerly_app/)

```bash
# Development
npm run dev                # Start dev server

# Build & Production
npm run build              # Build for production
npm start                  # Run production build

# Quality
npm run lint               # Lint code
npm run type-check         # TypeScript check
```

## 🗄️ Database Quick Reference

```sql
-- Connect to database
psql -U postgres -d ledgerly_dev

-- List tables
\dt dbo.*

-- View table structure
\d dbo.transactions

-- Common queries
SELECT * FROM dbo.users LIMIT 10;
SELECT * FROM dbo.transactions WHERE userId = 'uuid' ORDER BY transactionDate DESC LIMIT 20;
SELECT COUNT(*) FROM dbo.transactions WHERE type = 'expense';

-- Exit
\q
```

## 🔧 Environment Variables

### Backend (.env)
```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASS=password
DB_NAME=ledgerly_dev
DB_SSL=false
JWT_SECRET=your-secret-32-chars-minimum
JWT_EXPIRES=15m
PORT=3001
NODE_ENV=development
OPENAI_API_KEY=sk-your-key
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_BASE_URL=http://192.168.1.50:3001
NODE_ENV=development
```

## 📡 API Endpoints Quick Reference

### Authentication
```bash
POST /auth/register        # Register new user
POST /auth/login           # Login
POST /auth/refresh         # Refresh token
GET  /auth/me              # Get current user
POST /auth/logout          # Logout
```

### Transactions
```bash
GET    /transactions       # List all
POST   /transactions       # Create new
GET    /transactions/:id   # Get one
PATCH  /transactions/:id   # Update
DELETE /transactions/:id   # Delete
```

### Accounts
```bash
GET    /accounts          # List all
POST   /accounts          # Create new
GET    /accounts/:id      # Get one
PATCH  /accounts/:id      # Update
DELETE /accounts/:id      # Delete
```

### Categories, Budgets, Debts, Recurring
Same CRUD pattern as above:
- `/categories`
- `/budgets`
- `/debts`
- `/recurring`

### AI Features
```bash
POST /ai/parse-transaction  # Parse text to transaction
POST /ai/image              # Parse receipt image
POST /ai/audio              # Parse voice recording
```

### Reports
```bash
GET /reports/summary              # Financial summary
GET /reports/category-spending    # Spending by category
GET /reports/monthly-trends       # Monthly trends
```

## 🧪 Testing with curl

```bash
# Register
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","name":"Test"}'

# Login (save cookies)
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"email":"test@example.com","password":"password123"}'

# Get transactions (use cookies)
curl -X GET http://localhost:3001/transactions \
  -b cookies.txt

# Create transaction
curl -X POST http://localhost:3001/transactions \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"amount":"50.00","type":"expense","description":"Test"}'
```

## 🐛 Debugging

### Backend Debug (VS Code)
Press F5 or use launch configuration:
```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Backend",
  "runtimeExecutable": "npm",
  "runtimeArgs": ["run", "start:debug"],
  "cwd": "${workspaceFolder}/ledgerly-api"
}
```

### Frontend Debug
1. Start dev server: `npm run dev`
2. Open Chrome DevTools (F12)
3. Use React DevTools extension

### Common Debug Commands
```bash
# Check if port is in use
lsof -i :3001                    # Mac/Linux
netstat -ano | findstr :3001     # Windows

# Kill process
kill -9 <PID>                    # Mac/Linux
taskkill /PID <PID> /F           # Windows

# Check logs
tail -f ~/.pm2/logs/*.log        # PM2 logs
docker logs <container-id>       # Docker logs
```

## 🔍 Troubleshooting Quick Fixes

### "Port already in use"
```bash
# Find and kill process
lsof -i :3001
kill -9 <PID>
```

### "Cannot connect to database"
```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql  # Linux
brew services list               # Mac

# Start PostgreSQL
sudo systemctl start postgresql  # Linux
brew services start postgresql   # Mac
```

### "Migration failed"
```bash
# Revert and retry
npm run migration:revert
npm run migration:run
```

### "Module not found"
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### "CORS error"
Check backend main.ts CORS config includes frontend URL

### "JWT expired"
Clear browser cookies and localStorage, login again

## 📦 Dependency Management

```bash
# Check for updates
npm outdated

# Update specific package
npm install package@latest

# Update all (careful!)
npm update

# Audit security
npm audit
npm audit fix
```

## 🚢 Deployment Quick Start

### Using Docker Compose
```bash
docker-compose up -d
docker-compose logs -f
docker-compose down
```

### Using PM2
```bash
# Start
pm2 start dist/main.js --name ledgerly-api

# Monitor
pm2 status
pm2 logs
pm2 monit

# Restart
pm2 restart ledgerly-api

# Stop
pm2 stop ledgerly-api
```

## 🔐 Security Checklist

- [ ] Environment variables not in git
- [ ] Strong JWT_SECRET (32+ chars)
- [ ] HTTPS enabled in production
- [ ] CORS properly configured
- [ ] Database SSL enabled
- [ ] Rate limiting implemented (TODO)
- [ ] Security headers configured
- [ ] Dependencies up to date

## 📚 Documentation Links

- [Architecture](docs/ARCHITECTURE.md) - System design
- [API Reference](docs/API_REFERENCE.md) - All endpoints
- [Database Schema](docs/DATABASE_SCHEMA.md) - DB structure
- [Deployment](docs/DEPLOYMENT.md) - Deploy guides
- [Development](docs/DEVELOPMENT.md) - Dev workflows
- [Contributing](docs/CONTRIBUTING.md) - How to contribute
- [Troubleshooting](docs/TROUBLESHOOTING.md) - Common issues
- [Security](docs/SECURITY.md) - Security guide

## 💡 Tips & Tricks

### VS Code Shortcuts
- `Ctrl/Cmd + P` - Quick file search
- `Ctrl/Cmd + Shift + F` - Search in all files
- `F12` - Go to definition
- `Shift + F12` - Find references

### Git Shortcuts
```bash
alias gs='git status'
alias gc='git commit -m'
alias gp='git push'
alias gl='git log --oneline -10'
alias gd='git diff'
```

### Database Backups
```bash
# Backup
pg_dump ledgerly_dev > backup.sql

# Restore
psql ledgerly_dev < backup.sql
```

### Performance Monitoring
```bash
# Backend memory usage
node --expose-gc --max-old-space-size=512 dist/main.js

# PM2 monitoring
pm2 monit
```

## 🆘 Getting Help

1. Check [Troubleshooting Guide](docs/TROUBLESHOOTING.md)
2. Search [GitHub Issues](https://github.com/Chetancns/Ledgerly/issues)
3. Review relevant documentation in `/docs`
4. Create new issue with:
   - Error message
   - Steps to reproduce
   - Environment details

## 🎯 Common Workflows

### Adding a New Feature
1. Create feature branch: `git checkout -b feature/name`
2. Add entity (if needed): Update `src/[module]/[module].entity.ts`
3. Generate migration: `npm run migration:generate`
4. Create service: `src/[module]/[module].service.ts`
5. Create controller: `src/[module]/[module].controller.ts`
6. Add frontend page: `src/pages/[feature].tsx`
7. Add API service: `src/services/[feature].ts`
8. Test thoroughly
9. Create PR

### Fixing a Bug
1. Create fix branch: `git checkout -b fix/description`
2. Write test that reproduces bug
3. Fix the bug
4. Verify test passes
5. Test manually
6. Create PR

### Updating Dependencies
1. Check for updates: `npm outdated`
2. Update: `npm update` or `npm install package@latest`
3. Test application
4. Run tests: `npm run test`
5. Commit changes

---

**Last Updated**: 2024-01-15
**Version**: 1.0.0
