# Contributing to Ledgerly

Thank you for your interest in contributing to Ledgerly! This guide will help you get started with contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Reporting Bugs](#reporting-bugs)
- [Suggesting Features](#suggesting-features)

---

## Code of Conduct

### Our Pledge

We are committed to providing a friendly, safe, and welcoming environment for all contributors.

### Expected Behavior

- Be respectful and inclusive
- Accept constructive criticism gracefully
- Focus on what is best for the community
- Show empathy towards others

### Unacceptable Behavior

- Harassment, discrimination, or offensive comments
- Publishing others' private information
- Trolling or insulting comments
- Other unprofessional conduct

---

## Getting Started

### Prerequisites

Before contributing, ensure you have:

- Node.js 18.x or later
- npm 9.x or later
- PostgreSQL 14.x or later
- Git
- A code editor (VS Code recommended)

### First Time Setup

1. **Fork the repository**
   ```bash
   # Click the "Fork" button on GitHub
   ```

2. **Clone your fork**
   ```bash
   git clone https://github.com/YOUR-USERNAME/Ledgerly.git
   cd Ledgerly
   ```

3. **Add upstream remote**
   ```bash
   git remote add upstream https://github.com/Chetancns/Ledgerly.git
   ```

4. **Install dependencies**
   ```bash
   # Backend
   cd ledgerly-api
   npm install
   
   # Frontend
   cd ../ledgerly_app
   npm install
   ```

5. **Setup environment variables**
   ```bash
   # Backend
   cp ledgerly-api/.env.example ledgerly-api/.env
   # Edit .env with your configuration
   
   # Frontend
   cp ledgerly_app/.env.local.example ledgerly_app/.env.local
   # Edit .env.local with your configuration
   ```

6. **Setup database**
   ```bash
   # Create database
   createdb ledgerly_dev
   
   # Run migrations
   cd ledgerly-api
   npm run migration:run
   ```

7. **Verify setup**
   ```bash
   # Start backend
   cd ledgerly-api
   npm run start:dev
   
   # In another terminal, start frontend
   cd ledgerly_app
   npm run dev
   
   # Visit http://localhost:3000
   ```

---

## Development Setup

### Recommended Tools

- **IDE**: Visual Studio Code
- **Extensions**:
  - ESLint
  - Prettier
  - TypeScript and JavaScript Language Features
  - Tailwind CSS IntelliSense
  - GitLens

### VS Code Settings

Create `.vscode/settings.json`:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib"
}
```

---

## Project Structure

```
Ledgerly/
├── ledgerly-api/          # Backend (NestJS)
│   ├── src/
│   │   ├── auth/          # Authentication module
│   │   ├── users/         # User management
│   │   ├── accounts/      # Account management
│   │   ├── transactions/  # Transaction management
│   │   ├── categories/    # Category management
│   │   ├── budgets/       # Budget management
│   │   ├── debts/         # Debt tracking
│   │   ├── recurring/     # Recurring transactions
│   │   ├── reports/       # Financial reports
│   │   ├── AIChat/        # AI features
│   │   └── migrations/    # Database migrations
│   ├── data-source.ts     # TypeORM configuration
│   └── package.json
│
├── ledgerly_app/          # Frontend (Next.js)
│   ├── src/
│   │   ├── pages/         # Next.js pages
│   │   ├── components/    # React components
│   │   ├── services/      # API service layer
│   │   ├── hooks/         # Custom React hooks
│   │   └── models/        # TypeScript types
│   └── package.json
│
├── docs/                  # Documentation
│   ├── ARCHITECTURE.md
│   ├── API_REFERENCE.md
│   ├── DATABASE_SCHEMA.md
│   ├── DEPLOYMENT.md
│   └── CONTRIBUTING.md
│
└── README.md              # Project overview
```

---

## Development Workflow

### 1. Create a Branch

```bash
# Update your local main branch
git checkout main
git pull upstream main

# Create a feature branch
git checkout -b feature/your-feature-name

# Or for bug fixes
git checkout -b fix/bug-description
```

### 2. Make Changes

- Write clean, readable code
- Follow existing patterns and conventions
- Add comments for complex logic
- Update documentation if needed

### 3. Test Your Changes

```bash
# Backend tests
cd ledgerly-api
npm run test

# Frontend tests
cd ledgerly_app
npm run test

# Manual testing
# Start both backend and frontend
# Test all affected functionality
```

### 4. Commit Your Changes

```bash
# Stage changes
git add .

# Commit with descriptive message
git commit -m "feat: add transaction filtering by date range"
```

### 5. Push and Create PR

```bash
# Push to your fork
git push origin feature/your-feature-name

# Create Pull Request on GitHub
# Fill out the PR template completely
```

---

## Coding Standards

### TypeScript

- Use TypeScript for all new code
- Define proper types and interfaces
- Avoid `any` type unless absolutely necessary
- Use meaningful variable and function names

```typescript
// Good
interface Transaction {
  id: string;
  amount: number;
  type: 'expense' | 'income';
  description: string;
}

async function getTransactionsByDateRange(
  startDate: Date,
  endDate: Date
): Promise<Transaction[]> {
  // Implementation
}

// Avoid
function getData(a: any, b: any): any {
  // Implementation
}
```

### NestJS Backend

- Follow NestJS conventions
- Use dependency injection
- Implement proper error handling
- Use DTOs for validation

```typescript
// Controller
@Controller('transactions')
@UseGuards(JwtAuthGuard)
export class TransactionController {
  constructor(private transactionService: TransactionService) {}

  @Post()
  async create(
    @Body() dto: CreateTransactionDto,
    @GetUser() user: User
  ) {
    return this.transactionService.create(dto, user.id);
  }
}

// Service
@Injectable()
export class TransactionService {
  constructor(
    @InjectRepository(Transaction)
    private transactionRepo: Repository<Transaction>
  ) {}

  async create(dto: CreateTransactionDto, userId: string) {
    // Implementation
  }
}
```

### React/Next.js Frontend

- Use functional components
- Use hooks for state management
- Keep components small and focused
- Implement proper error boundaries

```typescript
// Good component structure
interface TransactionListProps {
  transactions: Transaction[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export const TransactionList: React.FC<TransactionListProps> = ({
  transactions,
  onEdit,
  onDelete
}) => {
  // Component logic
  return (
    // JSX
  );
};
```

### CSS/Tailwind

- Use Tailwind utility classes
- Keep custom CSS minimal
- Use consistent spacing and colors
- Follow mobile-first approach

```tsx
// Good
<div className="flex flex-col gap-4 p-4 bg-white rounded-lg shadow-md">
  <h2 className="text-xl font-semibold text-gray-800">Title</h2>
  <p className="text-gray-600">Description</p>
</div>
```

### File Naming

- **Components**: PascalCase (e.g., `TransactionForm.tsx`)
- **Utilities**: camelCase (e.g., `formatCurrency.ts`)
- **Types**: PascalCase (e.g., `Transaction.ts`)
- **Services**: camelCase (e.g., `api.ts`)

---

## Testing Guidelines

### Unit Tests

```typescript
// Example test file: transaction.service.spec.ts
describe('TransactionService', () => {
  let service: TransactionService;
  let repository: Repository<Transaction>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        TransactionService,
        {
          provide: getRepositoryToken(Transaction),
          useClass: Repository
        }
      ]
    }).compile();

    service = module.get<TransactionService>(TransactionService);
    repository = module.get<Repository<Transaction>>(
      getRepositoryToken(Transaction)
    );
  });

  it('should create a transaction', async () => {
    const dto: CreateTransactionDto = {
      amount: 100,
      type: 'expense',
      description: 'Test transaction'
    };

    jest.spyOn(repository, 'save').mockResolvedValue({
      id: '123',
      ...dto
    } as Transaction);

    const result = await service.create(dto, 'user-id');
    expect(result.amount).toBe(100);
  });
});
```

### Integration Tests

- Test API endpoints end-to-end
- Test database interactions
- Test authentication flows

### Manual Testing Checklist

- [ ] All forms validate correctly
- [ ] Error messages display properly
- [ ] Loading states work correctly
- [ ] Navigation works as expected
- [ ] Data persists correctly
- [ ] Responsive design works on mobile
- [ ] Browser console has no errors

---

## Commit Guidelines

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation changes
- **style**: Code style changes (formatting)
- **refactor**: Code refactoring
- **test**: Adding or updating tests
- **chore**: Maintenance tasks

### Examples

```
feat(transactions): add date range filtering

Add ability to filter transactions by custom date range.
Includes new date picker component and API endpoint.

Closes #123
```

```
fix(auth): resolve token refresh loop

Fixed infinite loop in token refresh logic by properly
handling 401 responses.

Fixes #456
```

```
docs(api): update transaction endpoint documentation

Added request/response examples for all transaction
endpoints.
```

### Best Practices

- Use present tense ("add" not "added")
- Keep subject line under 50 characters
- Separate subject from body with blank line
- Wrap body at 72 characters
- Reference issues in footer

---

## Pull Request Process

### Before Submitting

1. **Update documentation** if needed
2. **Add tests** for new features
3. **Run linter** and fix warnings
4. **Test thoroughly** in development
5. **Update changelog** if applicable

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Documentation updated
- [ ] No new warnings
- [ ] Tests added/updated
- [ ] Changes reviewed locally

## Related Issues
Closes #123
```

### Review Process

1. **Automated checks** must pass
2. **Code review** by maintainers
3. **Testing** by reviewers
4. **Approval** from at least one maintainer
5. **Merge** by maintainers

### After Merge

- Delete your branch
- Update your local repository
- Start working on next feature

---

## Reporting Bugs

### Before Reporting

1. **Search existing issues** to avoid duplicates
2. **Test with latest version** of main branch
3. **Collect relevant information**

### Bug Report Template

```markdown
## Bug Description
Clear description of the bug

## Steps to Reproduce
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

## Expected Behavior
What should happen

## Actual Behavior
What actually happens

## Screenshots
If applicable

## Environment
- OS: [e.g., Windows 10]
- Browser: [e.g., Chrome 120]
- Node version: [e.g., 18.17.0]
- Database: [e.g., PostgreSQL 14.5]

## Additional Context
Any other relevant information
```

---

## Suggesting Features

### Feature Request Template

```markdown
## Feature Description
Clear description of the feature

## Problem Statement
What problem does this solve?

## Proposed Solution
How should this work?

## Alternatives Considered
Other approaches you've thought about

## Additional Context
Mockups, examples, or references
```

### Feature Discussion

- Feature requests are discussed in GitHub Issues
- Maintainers will label and prioritize
- Community feedback is encouraged
- Approved features can be implemented

---

## Database Migrations

### Creating Migrations

```bash
# Make changes to entities
# Then generate migration
cd ledgerly-api
npm run migration:generate

# Migration file created in src/migrations/
```

### Migration Guidelines

- **One migration per feature**
- **Test migrations** both up and down
- **Document** breaking changes
- **Never modify** existing migrations
- **Include** data migrations if needed

### Example Migration

```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTransactionTags1234567890 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "dbo"."transactions"
      ADD COLUMN "tags" TEXT[]
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "dbo"."transactions"
      DROP COLUMN "tags"
    `);
  }
}
```

---

## Code Review Checklist

### For Authors

- [ ] Code is self-documenting with clear names
- [ ] Complex logic has comments
- [ ] No commented-out code
- [ ] No console.log statements (use proper logging)
- [ ] Error handling is comprehensive
- [ ] Security best practices followed
- [ ] Performance considered
- [ ] Accessibility considered (frontend)

### For Reviewers

- [ ] Code follows project conventions
- [ ] Logic is sound and efficient
- [ ] Edge cases are handled
- [ ] Tests are adequate
- [ ] Documentation is updated
- [ ] No security vulnerabilities
- [ ] No performance issues

---

## Getting Help

- **Documentation**: Check `/docs` directory
- **Issues**: Search GitHub Issues
- **Discussions**: GitHub Discussions (if enabled)
- **Questions**: Open an issue with "question" label

---

## Recognition

Contributors will be recognized in:
- GitHub contributors page
- Release notes for significant contributions
- Project documentation

---

## License

By contributing to Ledgerly, you agree that your contributions will be licensed under the same license as the project.

---

Thank you for contributing to Ledgerly! Your efforts help make personal finance management better for everyone.
