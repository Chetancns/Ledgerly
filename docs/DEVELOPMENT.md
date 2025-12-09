# Development Guide for Ledgerly

## Quick Start

This guide provides detailed instructions for developers working on Ledgerly.

## Table of Contents

- [Environment Setup](#environment-setup)
- [Running the Application](#running-the-application)
- [Development Tools](#development-tools)
- [Working with the Backend](#working-with-the-backend)
- [Working with the Frontend](#working-with-the-frontend)
- [Database Operations](#database-operations)
- [API Development](#api-development)
- [Testing](#testing)
- [Debugging](#debugging)
- [Common Tasks](#common-tasks)
- [Best Practices](#best-practices)

---

## Environment Setup

### Windows (PowerShell)

```powershell
# Install Node.js (if not installed)
# Download from https://nodejs.org/

# Verify installation
node --version  # Should be 18.x or later
npm --version   # Should be 9.x or later

# Install PostgreSQL
# Download from https://www.postgresql.org/download/windows/

# Clone repository
git clone https://github.com/Chetancns/Ledgerly.git
cd Ledgerly

# Install backend dependencies
cd ledgerly-api
npm install

# Install frontend dependencies
cd ../ledgerly_app
npm install
```

### Linux/Mac (Bash)

```bash
# Install Node.js using nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 18
nvm use 18

# Install PostgreSQL (Ubuntu/Debian)
sudo apt-get update
sudo apt-get install postgresql postgresql-contrib

# Clone repository
git clone https://github.com/Chetancns/Ledgerly.git
cd Ledgerly

# Install dependencies
cd ledgerly-api && npm install
cd ../ledgerly_app && npm install
```

### Environment Variables

#### Backend (.env)

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASS=your_password
DB_NAME=ledgerly_dev
DB_SSL=false

# Authentication
JWT_SECRET=dev-secret-key-change-in-production
JWT_EXPIRES=15m

# Server
PORT=3001
NODE_ENV=development

# OpenAI (optional for AI features)
OPENAI_API_KEY=sk-your-api-key

# CORS
CORS_ORIGIN=http://localhost:3000,http://192.168.1.50:3000
```

#### Frontend (.env.local)

```env
NEXT_PUBLIC_API_BASE_URL=http://192.168.1.50:3001
NODE_ENV=development
```

---

## Running the Application

### Using Batch File (Windows)

```powershell
# Start both backend and frontend
./start-apps.bat
```

### Manual Start

#### Terminal 1 - Backend

```bash
cd ledgerly-api
npm run start:dev
```

The backend will start on http://localhost:3001 with hot-reload enabled.

#### Terminal 2 - Frontend

```bash
cd ledgerly_app
npm run dev
```

The frontend will start on http://localhost:3000 with hot-reload enabled.

### Production Mode

```bash
# Backend
cd ledgerly-api
npm run build
npm run start:prod

# Frontend
cd ledgerly_app
npm run build
npm start
```

---

## Development Tools

### Recommended VS Code Extensions

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "eamodio.gitlens",
    "ms-vscode.vscode-typescript-next",
    "prisma.prisma",
    "wayou.vscode-todo-highlight"
  ]
}
```

### ESLint Configuration

The project uses ESLint for code quality. Configuration is in:
- Backend: `ledgerly-api/eslint.config.mjs`
- Frontend: `ledgerly_app/eslint.config.mjs`

```bash
# Run linter
npm run lint

# Fix auto-fixable issues
npm run lint:fix
```

### Prettier Configuration

Format code automatically:

```bash
# Format all files
npm run format

# Check formatting
npm run format:check
```

---

## Working with the Backend

### NestJS Architecture

```
src/
├── auth/              # Authentication & authorization
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   ├── jwt.strategy.ts
│   └── jwt.guard.ts
│
├── users/             # User management
│   ├── user.entity.ts
│   ├── user.controller.ts
│   └── user.service.ts
│
├── [module]/
│   ├── [module].entity.ts     # Database entity
│   ├── [module].controller.ts # HTTP endpoints
│   ├── [module].service.ts    # Business logic
│   └── dto/                   # Data transfer objects
│
├── common/            # Shared utilities
│   ├── decorators/
│   └── filters/
│
├── config/            # Configuration
│   └── typeorm.config.ts
│
└── main.ts           # Application entry point
```

### Creating a New Module

```bash
cd ledgerly-api

# Generate module with NestJS CLI
npx nest generate module features
npx nest generate controller features
npx nest generate service features

# Or generate all at once
npx nest generate resource features
```

### Creating an Entity

```typescript
// src/features/feature.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { User } from '../users/user.entity';

@Entity('dbo.features')
export class Feature {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @ManyToOne(() => User, user => user.features, { onDelete: 'CASCADE' })
  user: User;

  @Column('uuid')
  userId: string;

  @CreateDateColumn()
  createdAt: Date;
}
```

### Creating a DTO

```typescript
// src/features/dto/create-feature.dto.ts
import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class CreateFeatureDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;
}
```

### Creating a Controller

```typescript
// src/features/feature.controller.ts
import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { GetUser } from '../common/decorators/user.decorator';
import { FeatureService } from './feature.service';
import { CreateFeatureDto } from './dto/create-feature.dto';

@Controller('features')
@UseGuards(JwtAuthGuard)
export class FeatureController {
  constructor(private featureService: FeatureService) {}

  @Get()
  findAll(@GetUser() user: { userId: string }) {
    return this.featureService.findAll(user.userId);
  }

  @Post()
  create(@Body() dto: CreateFeatureDto, @GetUser() user: { userId: string }) {
    return this.featureService.create(dto, user.userId);
  }
}
```

### Creating a Service

```typescript
// src/features/feature.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Feature } from './feature.entity';
import { CreateFeatureDto } from './dto/create-feature.dto';

@Injectable()
export class FeatureService {
  constructor(
    @InjectRepository(Feature)
    private featureRepo: Repository<Feature>
  ) {}

  async findAll(userId: string): Promise<Feature[]> {
    return this.featureRepo.find({ where: { userId } });
  }

  async create(dto: CreateFeatureDto, userId: string): Promise<Feature> {
    const feature = this.featureRepo.create({ ...dto, userId });
    return this.featureRepo.save(feature);
  }
}
```

---

## Working with the Frontend

### Next.js Architecture

```
src/
├── pages/              # Next.js pages (routes)
│   ├── _app.tsx       # App wrapper
│   ├── index.tsx      # Home page
│   ├── login.tsx      # Login page
│   └── [feature].tsx  # Feature pages
│
├── components/         # React components
│   ├── Layout.tsx
│   ├── TransactionForm.tsx
│   └── [Component].tsx
│
├── services/           # API clients
│   ├── api.ts         # Base Axios config
│   ├── auth.ts        # Auth API
│   └── [feature].ts   # Feature APIs
│
├── hooks/              # Custom React hooks
│   └── useAuth.ts
│
├── models/             # TypeScript types
│   └── types.ts
│
└── index.css          # Global styles
```

**HTTP/auth client:** `src/services/api.ts` sets `withCredentials: true` and, before any POST/PUT/PATCH/DELETE, calls `initCsrf` to refresh the `XSRF-TOKEN` cookie and attach `X-CSRF-Token`. Tokens live in HTTP-only cookies; 401s trigger `/auth/refresh` and failed refresh redirects to `/login`. Avoid manual Authorization headers or localStorage token storage—use the shared client/hooks.

**Navigation:** `src/components/Layout.tsx` now groups Transactions + Recurring under a dropdown (desktop + mobile) and moves the remaining links into a “More” modal; reuse that pattern for new nav items.

### Creating a New Page

```typescript
// src/pages/features.tsx
import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { getFeatures } from '../services/features';

export default function FeaturesPage() {
  const [features, setFeatures] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFeatures();
  }, []);

  const loadFeatures = async () => {
    try {
      const data = await getFeatures();
      setFeatures(data);
    } catch (error) {
      console.error('Error loading features:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Features</h1>
        {loading ? (
          <p>Loading...</p>
        ) : (
          <ul>
            {features.map(feature => (
              <li key={feature.id}>{feature.name}</li>
            ))}
          </ul>
        )}
      </div>
    </Layout>
  );
}
```

### Creating a Component

```typescript
// src/components/FeatureCard.tsx
import React from 'react';

interface FeatureCardProps {
  name: string;
  description: string;
  onEdit: () => void;
  onDelete: () => void;
}

export const FeatureCard: React.FC<FeatureCardProps> = ({
  name,
  description,
  onEdit,
  onDelete
}) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <h3 className="text-lg font-semibold">{name}</h3>
      <p className="text-gray-600 mt-2">{description}</p>
      <div className="mt-4 flex gap-2">
        <button
          onClick={onEdit}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Edit
        </button>
        <button
          onClick={onDelete}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        >
          Delete
        </button>
      </div>
    </div>
  );
};
```

### Creating an API Service

```typescript
// src/services/features.ts
import api from './api';

export interface Feature {
  id: string;
  name: string;
  userId: string;
  createdAt: string;
}

export const getFeatures = async (): Promise<Feature[]> => {
  const response = await api.get('/features');
  return response.data;
};

export const createFeature = async (data: { name: string }): Promise<Feature> => {
  const response = await api.post('/features', data);
  return response.data;
};

export const updateFeature = async (id: string, data: { name: string }): Promise<Feature> => {
  const response = await api.patch(`/features/${id}`, data);
  return response.data;
};

export const deleteFeature = async (id: string): Promise<void> => {
  await api.delete(`/features/${id}`);
};
```

### Custom Hooks

```typescript
// src/hooks/useFeatures.ts
import { useState, useEffect } from 'react';
import { getFeatures, Feature } from '../services/features';

export const useFeatures = () => {
  const [features, setFeatures] = useState<Feature[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadFeatures = async () => {
    try {
      setLoading(true);
      const data = await getFeatures();
      setFeatures(data);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFeatures();
  }, []);

  return { features, loading, error, reload: loadFeatures };
};
```

---

## Database Operations

### TypeORM Commands

```bash
# Generate migration after entity changes
cd ledgerly-api
npm run migration:generate

# Run pending migrations
npm run migration:run

# Revert last migration
npm run migration:revert
```

### Direct Database Access

```bash
# Connect to database
psql -U postgres -d ledgerly_dev

# List all tables
\dt dbo.*

# Describe table structure
\d dbo.transactions

# Query data
SELECT * FROM dbo.users LIMIT 10;

# Exit
\q
```

### Common Queries

```sql
-- Get user transaction summary
SELECT 
  u.email,
  COUNT(t.id) as transaction_count,
  SUM(CASE WHEN t.type = 'expense' THEN t.amount::numeric ELSE 0 END) as total_expenses,
  SUM(CASE WHEN t.type = 'income' THEN t.amount::numeric ELSE 0 END) as total_income
FROM dbo.users u
LEFT JOIN dbo.transactions t ON t.userId = u.id
GROUP BY u.id, u.email;

-- Find transactions without categories
SELECT * FROM dbo.transactions WHERE categoryId IS NULL;

-- Get budget utilization
SELECT 
  b.id,
  c.name as category,
  b.amount::numeric as budget,
  COALESCE(SUM(t.amount::numeric), 0) as spent,
  (b.amount::numeric - COALESCE(SUM(t.amount::numeric), 0)) as remaining
FROM dbo.budgets b
LEFT JOIN dbo.categories c ON b.categoryId = c.id
LEFT JOIN dbo.transactions t ON t.categoryId = c.id 
  AND t.type = 'expense'
  AND t.transactionDate BETWEEN b.startDate AND b.endDate
GROUP BY b.id, c.name, b.amount;
```

---

## API Development

### Testing Endpoints with curl

```bash
# Register new user
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","name":"Test User"}'

# Login (saves cookies)
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"email":"test@example.com","password":"password123"}'

# Fetch CSRF token (rotate token + return value)
curl -X GET http://localhost:3001/auth/csrf-token \
  -b cookies.txt -c cookies.txt
# copy csrfToken from the response into $CSRF

# Get transactions (with cookies)
curl -X GET http://localhost:3001/transactions \
  -b cookies.txt

# Create transaction (needs CSRF header)
curl -X POST http://localhost:3001/transactions \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: $CSRF" \
  -b cookies.txt \
  -d '{"amount":"50.00","type":"expense","description":"Test"}'
```

### Using Postman/Insomnia

1. Import API collection
2. Set base URL: `http://localhost:3001`
3. Enable cookie jar for authentication
4. Test endpoints

---

## Testing

### Running Tests

```bash
# Backend unit tests
cd ledgerly-api
npm run test

# Backend e2e tests
npm run test:e2e

# Frontend tests
cd ledgerly_app
npm run test

# Test coverage
npm run test:cov
```

### Writing Unit Tests

```typescript
// feature.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FeatureService } from './feature.service';
import { Feature } from './feature.entity';

describe('FeatureService', () => {
  let service: FeatureService;
  let repository: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeatureService,
        {
          provide: getRepositoryToken(Feature),
          useValue: {
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn()
          }
        }
      ]
    }).compile();

    service = module.get<FeatureService>(FeatureService);
    repository = module.get(getRepositoryToken(Feature));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return all features for user', async () => {
    const features = [{ id: '1', name: 'Test', userId: 'user1' }];
    jest.spyOn(repository, 'find').mockResolvedValue(features);

    const result = await service.findAll('user1');
    expect(result).toEqual(features);
    expect(repository.find).toHaveBeenCalledWith({ where: { userId: 'user1' } });
  });
});
```

---

## Debugging

### Backend Debugging (VS Code)

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Backend",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "start:debug"],
      "cwd": "${workspaceFolder}/ledgerly-api",
      "console": "integratedTerminal",
      "restart": true,
      "protocol": "inspector"
    }
  ]
}
```

### Frontend Debugging

1. Start dev server: `npm run dev`
2. Open Chrome DevTools
3. Use React DevTools extension
4. Set breakpoints in browser

### Console Logging

```typescript
// Backend - use NestJS Logger
import { Logger } from '@nestjs/common';

export class FeatureService {
  private readonly logger = new Logger(FeatureService.name);

  async findAll(userId: string) {
    this.logger.log(`Finding features for user: ${userId}`);
    // ...
  }
}

// Frontend - use console methods
console.log('Data:', data);
console.error('Error:', error);
console.warn('Warning:', warning);
console.table(arrayOfObjects);
```

---

## Common Tasks

### Adding a New Feature End-to-End

1. **Database**: Create entity and migration
2. **Backend**: Create module, controller, service
3. **Frontend**: Create page, component, service
4. **Test**: Write tests for backend and frontend
5. **Document**: Update API reference

### Updating Dependencies

```bash
# Check for updates
npm outdated

# Update package
npm update package-name

# Update all (careful!)
npm update

# Update major versions
npm install package-name@latest
```

### Code Generation

```bash
# Backend - NestJS CLI
npx nest generate module features
npx nest generate controller features
npx nest generate service features

# Full resource (CRUD)
npx nest generate resource features
```

---

## Best Practices

### Security
- Never commit `.env` files
- Use environment variables for secrets
- Validate all user input
- Sanitize database queries
- Use HTTPS in production

### Performance
- Use database indexes
- Implement pagination
- Cache frequently accessed data
- Optimize database queries
- Lazy load components

### Code Quality
- Follow TypeScript strict mode
- Write meaningful variable names
- Keep functions small and focused
- Comment complex logic
- Use async/await over promises

### Git Workflow
- Create feature branches
- Write descriptive commits
- Keep commits small and atomic
- Rebase before merging
- Review your own code first

---

## Useful Commands

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Check port usage
# Windows
netstat -ano | findstr :3001
# Linux/Mac
lsof -i :3001

# Kill process on port
# Windows
taskkill /PID <PID> /F
# Linux/Mac
kill -9 <PID>

# Database backup
pg_dump -U postgres ledgerly_dev > backup.sql

# Database restore
psql -U postgres ledgerly_dev < backup.sql
```

---

## Resources

- [NestJS Documentation](https://docs.nestjs.com/)
- [Next.js Documentation](https://nextjs.org/docs)
- [TypeORM Documentation](https://typeorm.io/)
- [React Documentation](https://react.dev/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
