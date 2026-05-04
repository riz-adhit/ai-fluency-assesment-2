# Test Organization Strategies

Guide for organizing Playwright tests in a maintainable, scalable structure.

## Directory Structure

### Recommended Structure

```
tests/
├── api/                    # API tests
│   ├── auth/
│   │   ├── login.spec.ts
│   │   ├── logout.spec.ts
│   │   └── refresh-token.spec.ts
│   ├── templates/
│   │   ├── create.spec.ts
│   │   ├── list.spec.ts
│   │   ├── update.spec.ts
│   │   └── delete.spec.ts
│   └── users/
│       └── profile.spec.ts
├── web/                    # Web UI tests
│   ├── auth/
│   │   └── login.spec.ts
│   ├── dashboard/
│   │   └── overview.spec.ts
│   └── templates/
│       ├── create.spec.ts
│       └── list.spec.ts
├── integration/            # End-to-end integration tests
│   └── template-workflow.spec.ts
├── fixtures/               # Test fixtures and setup
│   ├── auth-fixture.ts
│   ├── database-fixture.ts
│   └── test-setup.ts
├── data/                   # Test data
│   ├── auth.data.ts
│   ├── templates.data.ts
│   └── users.data.ts
└── helpers/                # Utility functions
    ├── api-helpers.ts
    ├── assertions.ts
    └── test-utils.ts

api/                        # API Page Objects
├── AuthApi.ts
├── TemplateApi.ts
├── UserApi.ts
└── BaseApi.ts

pages/                      # Web Page Objects
├── LoginPage.ts
├── DashboardPage.ts
├── TemplatePage.ts
├── BasePage.ts
└── components/
    ├── HeaderComponent.ts
    └── SidebarComponent.ts
```

## File Naming Conventions

### Test Files
- **Pattern**: `[feature].spec.ts`
- **Examples**: `login.spec.ts`, `create-template.spec.ts`, `user-profile.spec.ts`
- **Rule**: One feature per file, kebab-case naming

### Page Object Files
- **Pattern**: `[PageName]Page.ts` or `[ApiName]Api.ts`
- **Examples**: `LoginPage.ts`, `TemplateApi.ts`, `DashboardPage.ts`
- **Rule**: PascalCase, descriptive names

### Data Files
- **Pattern**: `[feature].data.ts`
- **Examples**: `auth.data.ts`, `templates.data.ts`
- **Rule**: Match feature name, kebab-case

### Fixture Files
- **Pattern**: `[feature]-fixture.ts`
- **Examples**: `auth-fixture.ts`, `database-fixture.ts`
- **Rule**: Descriptive, kebab-case

## Test Suite Organization

### By Priority/Suite Type

```typescript
// tests/smoke/critical.spec.ts
test.describe('Smoke Tests', { tag: '@smoke' }, () => {
  // Only P0 critical tests
  test('[P0] User can login', async () => { });
  test('[P0] User can create template', async () => { });
});

// tests/regression/full.spec.ts
test.describe('Regression Tests', { tag: '@regression' }, () => {
  // P0 + P1 tests
  test('[P1] User can filter templates', async () => { });
  test('[P1] User can update profile', async () => { });
});

// tests/extended/edge-cases.spec.ts
test.describe('Extended Tests', { tag: '@extended' }, () => {
  // P2 edge cases and rare scenarios
  test('[P2] Handle template with max length name', async () => { });
});
```

**Run by tag:**
```bash
npx playwright test --grep @smoke        # Smoke tests only
npx playwright test --grep @regression   # Regression suite
npx playwright test --grep "@smoke|@regression"  # Both
```

### By Feature/Module

```typescript
// tests/templates/templates.spec.ts
test.describe('Templates Module', () => {
  
  test.describe('Template Creation', () => {
    test('should create with valid data', async () => { });
    test('should validate required fields', async () => { });
  });
  
  test.describe('Template Listing', () => {
    test('should list all templates', async () => { });
    test('should filter by status', async () => { });
  });
  
  test.describe('Template Updates', () => {
    test('should update name', async () => { });
    test('should prevent unauthorized updates', async () => { });
  });
});
```

### By User Role

```typescript
// tests/roles/admin.spec.ts
test.describe('Admin User Tests', () => {
  test.use({ storageState: 'auth/admin.json' });
  
  test('admin can delete templates', async () => { });
  test('admin can manage users', async () => { });
});

// tests/roles/regular-user.spec.ts
test.describe('Regular User Tests', () => {
  test.use({ storageState: 'auth/user.json' });
  
  test('user cannot delete templates', async () => { });
  test('user can view own profile', async () => { });
});
```

## Test Data Management

### Centralized Data Files

```typescript
// tests/data/auth.data.ts
export const AUTH_DATA = {
  validUser: {
    email: 'user@test.com',
    password: 'ValidPass123!'
  },
  adminUser: {
    email: 'admin@test.com',
    password: 'AdminPass123!'
  },
  invalidEmail: {
    email: 'not-an-email',
    password: 'pass123'
  }
};

// Usage in tests:
import { AUTH_DATA } from '../data/auth.data';

test('login with valid user', async () => {
  await loginPage.login(
    AUTH_DATA.validUser.email,
    AUTH_DATA.validUser.password
  );
});
```

### Environment-Specific Data

```typescript
// tests/data/config.ts
const ENV = process.env.TEST_ENV || 'staging';

export const TEST_CONFIG = {
  staging: {
    baseURL: 'https://staging.example.com',
    apiURL: 'https://api-staging.example.com'
  },
  production: {
    baseURL: 'https://example.com',
    apiURL: 'https://api.example.com'
  }
}[ENV];

// Usage:
test('navigate to homepage', async ({ page }) => {
  await page.goto(TEST_CONFIG.baseURL);
});
```

### Dynamic Data Generation

```typescript
// tests/helpers/data-generator.ts
import { faker } from '@faker-js/faker';

export function generateUser() {
  return {
    email: faker.internet.email(),
    password: faker.internet.password(),
    name: faker.person.fullName()
  };
}

export function generateTemplate() {
  return {
    name: `Template ${faker.string.uuid()}`,
    description: faker.lorem.sentence(),
    status: 'draft'
  };
}

// Usage:
test('create template with random data', async () => {
  const templateData = generateTemplate();
  await templateApi.create(templateData);
});
```

## Fixtures and Setup

### Authentication Fixture

```typescript
// tests/fixtures/auth-fixture.ts
import { test as base } from '@playwright/test';

type AuthFixtures = {
  authenticatedPage: Page;
  adminPage: Page;
};

export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ page }, use) => {
    // Login before tests
    await page.goto('/login');
    await page.fill('[name="email"]', 'user@test.com');
    await page.fill('[name="password"]', 'pass123');
    await page.click('[type="submit"]');
    await page.waitForURL('/dashboard');
    
    await use(page);
    
    // Logout after tests (cleanup)
    await page.click('[data-testid="logout"]');
  },
  
  adminPage: async ({ page }, use) => {
    // Login as admin
    await page.goto('/login');
    await page.fill('[name="email"]', 'admin@test.com');
    await page.fill('[name="password"]', 'admin123');
    await page.click('[type="submit"]');
    
    await use(page);
  }
});

// Usage:
import { test } from './fixtures/auth-fixture';

test('user can view dashboard', async ({ authenticatedPage }) => {
  // Already logged in!
  await expect(authenticatedPage).toHaveURL('/dashboard');
});
```

### Database Fixture

```typescript
// tests/fixtures/database-fixture.ts
import { test as base } from '@playwright/test';
import { setupDatabase, cleanupDatabase } from '../helpers/db-helpers';

type DatabaseFixtures = {
  cleanDB: void;
};

export const test = base.extend<DatabaseFixtures>({
  cleanDB: [async ({}, use) => {
    // Setup: Clean database before test
    await cleanupDatabase();
    await setupDatabase();
    
    await use();
    
    // Teardown: Clean after test
    await cleanupDatabase();
  }, { auto: true }] // Auto-run for all tests using this fixture
});
```

## Test Tags and Filtering

### Tagging Strategy

```typescript
// Priority tags
test('[P0] Critical test', { tag: '@P0' }, async () => { });
test('[P1] Important test', { tag: '@P1' }, async () => { });
test('[P2] Nice to have', { tag: '@P2' }, async () => { });

// Suite tags
test('Smoke test', { tag: '@smoke' }, async () => { });
test('Regression test', { tag: '@regression' }, async () => { });

// Feature tags
test('Auth feature', { tag: '@auth' }, async () => { });
test('Template feature', { tag: '@templates' }, async () => { });

// Multiple tags
test('Critical auth test', { tag: ['@P0', '@smoke', '@auth'] }, async () => { });
```

### Running Tagged Tests

```bash
# Run by single tag
npx playwright test --grep @smoke

# Run by multiple tags (OR)
npx playwright test --grep "@smoke|@P0"

# Run by multiple tags (AND) - use regex
npx playwright test --grep "(?=.*@smoke)(?=.*@auth)"

# Exclude tags
npx playwright test --grep-invert @P2

# Complex combinations
npx playwright test --grep "@P0|@smoke" --grep-invert "@slow"
```

## Parallel Execution

### Configure Parallelism

```typescript
// playwright.config.ts
export default defineConfig({
  // Number of parallel workers
  workers: process.env.CI ? 2 : 4,
  
  // Parallel execution mode
  fullyParallel: true,
  
  // Projects for different configurations
  projects: [
    {
      name: 'API Tests',
      testDir: './tests/api',
      use: { baseURL: 'https://api.example.com' }
    },
    {
      name: 'Web Tests',
      testDir: './tests/web',
      use: { 
        baseURL: 'https://example.com',
        viewport: { width: 1280, height: 720 }
      }
    }
  ]
});
```

### Serial Execution for Dependent Tests

```typescript
// Mark entire suite as serial
test.describe.serial('Template workflow', () => {
  let templateId: string;
  
  test('create template', async () => {
    // Creates template
    templateId = 'created-id';
  });
  
  test('update template', async () => {
    // Uses templateId from previous test
    await updateTemplate(templateId);
  });
  
  test('delete template', async () => {
    // Deletes the template
    await deleteTemplate(templateId);
  });
});
```

## Reporting and Traceability

### JUnit Reporter for CI

```typescript
// playwright.config.ts
export default defineConfig({
  reporter: [
    ['list'], // Console output
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['html', { outputFolder: 'test-results/html' }]
  ]
});
```

### Link Tests to Requirements

```typescript
/**
 * CSV Test Case: Row 15 - API_Test_Cases_Auth_20260414.csv
 * Jira: AUTH-123
 * RFC: Authentication RFC v2.1
 */
test('[AUTH-123] User login with valid credentials', async () => {
  // Test implementation
});
```

### Custom Reporter for CSV Mapping

```typescript
// custom-reporter.ts
import { Reporter, TestCase, TestResult } from '@playwright/test/reporter';

class CSVMappingReporter implements Reporter {
  onTestEnd(test: TestCase, result: TestResult) {
    // Extract CSV reference from test title
    const csvRef = test.title.match(/\[REF:(.*?)\]/)?.[1];
    if (csvRef) {
      console.log(`CSV Test ${csvRef}: ${result.status}`);
    }
  }
}

export default CSVMappingReporter;
```

## Best Practices Summary

### DO:
- ✅ Group tests by feature/module
- ✅ Use descriptive test names
- ✅ Tag tests for easy filtering
- ✅ Externalize test data
- ✅ Use fixtures for common setup
- ✅ Keep tests independent
- ✅ Maintain traceability to requirements

### DON'T:
- ❌ Mix web and API tests in same file
- ❌ Hard-code test data in tests
- ❌ Create test dependencies
- ❌ Duplicate setup logic
- ❌ Use unclear naming
- ❌ Ignore priority/tags
- ❌ Forget cleanup

## Example Project Structure

```
pokemon-play/
├── tests/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── login.spec.ts          # [P0] Login tests
│   │   │   └── token.spec.ts          # [P1] Token refresh
│   │   └── templates/
│   │       ├── create.spec.ts         # [P0] Create template
│   │       ├── list.spec.ts           # [P0] List templates
│   │       └── publish.spec.ts        # [P1] Publish template
│   ├── web/
│   │   └── login.spec.ts
│   ├── fixtures/
│   │   ├── auth-fixture.ts
│   │   └── test-setup.ts
│   └── data/
│       ├── auth.data.ts
│       └── templates.data.ts
├── api/
│   ├── AuthApi.ts
│   ├── TemplateApi.ts
│   └── BaseApi.ts
├── pages/
│   ├── LoginPage.ts
│   └── DashboardPage.ts
└── playwright.config.ts
```

Run tests:
```bash
# All tests
npx playwright test

# Smoke tests only
npx playwright test --grep @smoke

# API tests only
npx playwright test tests/api

# Templates feature
npx playwright test --grep @templates

# P0 priority
npx playwright test --grep @P0

# With HTML report
npx playwright test --reporter=html
```
