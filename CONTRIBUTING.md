# Dirq Solutions CRM - Contributing Guide

## 🚀 Getting Started

### Prerequisites
- Node.js 20+
- npm or bun
- Git

### Local Development Setup

1. **Clone the repository**
```bash
git clone <repository-url>
cd dirq-solutions-crmwebsite
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
cp .env.example .env.local
# Fill in your Supabase credentials
```

4. **Run development server**
```bash
npm run dev
```

5. **Run tests**
```bash
npm test
npm run test:ui       # Open Vitest UI
npm run test:coverage # Generate coverage report
```

## 📋 Development Workflow

### Before Starting Work

1. Pull latest changes from `main`
```bash
git checkout main
git pull origin main
```

2. Create a feature branch
```bash
git checkout -b feature/your-feature-name
```

### During Development

1. **Follow TypeScript strict mode**
   - Enable `strict: true` in tsconfig.json
   - Fix all type errors before committing

2. **Write tests for new features**
   - Aim for 60%+ test coverage
   - Test critical paths (auth, CRUD operations)
   - Use Vitest + React Testing Library

3. **Follow code style**
   - Run `npm run lint` before committing
   - Use Prettier for formatting
   - Follow existing naming conventions

### Code Quality Standards

#### Component Structure
```tsx
// 1. Imports
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

// 2. Types
interface Props {
  id: string;
  onSave: () => void;
}

// 3. Component
export function MyComponent({ id, onSave }: Props) {
  // 4. Hooks
  const [state, setState] = useState();
  const { data } = useQuery(...);
  
  // 5. Handlers
  const handleClick = () => { ... };
  
  // 6. Render
  return <div>...</div>;
}
```

#### Naming Conventions
- **Components**: PascalCase (`CompanyCard.tsx`)
- **Hooks**: camelCase with `use` prefix (`useCompanies.ts`)
- **Types**: PascalCase (`Company`, `CompanyStatus`)
- **Functions**: camelCase (`handleSubmit`, `fetchCompanies`)
- **Constants**: UPPER_SNAKE_CASE (`API_URL`, `MAX_ITEMS`)

#### File Organization
```
src/features/
  companies/
    components/       # UI components
      CompanyCard.tsx
      CompanyForm.tsx
    hooks/           # Data fetching hooks
      useCompanies.ts
      useCompanyMutations.ts
    CompaniesPage.tsx # Main page component
    types.ts         # Feature-specific types
```

### Testing Guidelines

1. **Unit Tests** - Test individual functions/hooks
```tsx
describe('useCompanies', () => {
  it('should fetch companies successfully', async () => {
    // Test implementation
  });
});
```

2. **Component Tests** - Test UI components
```tsx
describe('CompanyCard', () => {
  it('should display company name', () => {
    render(<CompanyCard company={mockCompany} />);
    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
  });
});
```

3. **Integration Tests** - Test complete user flows
```tsx
describe('Create Company Flow', () => {
  it('should create a company successfully', async () => {
    // Full flow test
  });
});
```

### Committing Changes

1. **Stage your changes**
```bash
git add .
```

2. **Commit with conventional commits**
```bash
git commit -m "feat: add company search filter"
git commit -m "fix: resolve authentication bug"
git commit -m "test: add tests for useAuth hook"
git commit -m "docs: update README with new features"
```

Commit types:
- `feat:` New feature
- `fix:` Bug fix
- `test:` Adding tests
- `docs:` Documentation changes
- `refactor:` Code refactoring
- `style:` Formatting changes
- `chore:` Maintenance tasks

3. **Push to your branch**
```bash
git push origin feature/your-feature-name
```

4. **Create Pull Request**
- Go to GitHub
- Create PR from your branch to `main`
- Fill in PR template
- Request review

### Pull Request Guidelines

**PR Title**: Use conventional commit format
```
feat: Add company search filter
fix: Resolve authentication timeout issue
```

**PR Description** should include:
- 📝 **What** - What changes were made
- 🎯 **Why** - Why these changes were necessary
- 🧪 **Testing** - How to test the changes
- 📸 **Screenshots** - For UI changes
- ⚠️ **Breaking Changes** - If any

**PR Checklist**:
- [ ] Code follows style guidelines
- [ ] Tests added/updated
- [ ] TypeScript types are correct
- [ ] No console.log statements
- [ ] Documentation updated
- [ ] CI pipeline passes

## 🧪 Testing Requirements

### Minimum Coverage
- Overall: 60%
- Critical paths: 80%+
- New features: 80%+

### Priority Test Areas
1. Authentication (`useAuth`)
2. Protected routes (`ProtectedRoute`)
3. Data fetching hooks (`useCompanies`, `useContacts`)
4. Form validation (`CompanyForm`, `ContactForm`)
5. Mutations (`useCompanyMutations`)

## 🚨 Common Pitfalls to Avoid

1. ❌ **Don't use `any` type**
```tsx
// Bad
const data: any = fetchData();

// Good
const data: Company[] = fetchData();
```

2. ❌ **Don't ignore errors**
```tsx
// Bad
try {
  await saveData();
} catch (error) {
  console.error(error); // Silent failure
}

// Good
try {
  await saveData();
  toast.success('Saved successfully');
} catch (error) {
  toast.error('Failed to save');
  captureException(error);
}
```

3. ❌ **Don't mutate state directly**
```tsx
// Bad
state.items.push(newItem);

// Good
setState({ ...state, items: [...state.items, newItem] });
```

4. ❌ **Don't use magic numbers**
```tsx
// Bad
if (project.stage === 3) { ... }

// Good
if (project.stage === ProjectStage.NEGOTIATION) { ... }
```

## 📦 Dependencies

### Adding New Dependencies

1. Check if existing library can solve the problem
2. Research alternatives (bundle size, maintenance)
3. Discuss with team before adding
4. Document why it was chosen

```bash
npm install <package-name>
```

### Updating Dependencies

```bash
# Check outdated packages
npm outdated

# Update specific package
npm update <package-name>

# Update all packages (carefully!)
npm update
```

## 🔍 Code Review Process

### As a Reviewer
- Check code quality and style
- Test functionality locally
- Verify tests pass
- Look for edge cases
- Suggest improvements
- Approve when ready

### As an Author
- Respond to feedback promptly
- Make requested changes
- Re-request review after changes
- Don't take feedback personally
- Thank reviewers

## 🆘 Getting Help

- 💬 **Slack**: #dev-crm channel
- 📧 **Email**: dev@dirq.nl
- 📖 **Docs**: See project documentation
- 🐛 **Bugs**: Create GitHub issue

## 📚 Additional Resources

- [React Query Docs](https://tanstack.com/query/latest)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Vitest Docs](https://vitest.dev/)
- [shadcn/ui Components](https://ui.shadcn.com/)

---

Thank you for contributing to Dirq Solutions CRM! 🎉
