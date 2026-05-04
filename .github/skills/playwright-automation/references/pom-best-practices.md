# Page Object Model Best Practices

Guide for implementing high-quality Page Object Models in Playwright automation.

## Core Principles

### 1. Separation of Concerns
- **Page Objects**: Contain element locators and interaction methods
- **Tests**: Contain test logic, assertions, and business flow
- **Test Data**: Externalized in separate files

### 2. Single Responsibility
- One Page Object per page/component/API resource
- Methods should do one thing well
- Avoid business logic in Page Objects

### 3. Encapsulation
- Hide implementation details
- Expose only what tests need
- Use private properties for internal state

## Structure Guidelines

### Page Object Class Structure

```typescript
export class PageName {
  // 1. Private page context
  private readonly page: Page;
  
  // 2. Element locators (lazy evaluated)
  readonly elementName = (): Locator => this.page.locator('[data-testid="id"]');
  
  // 3. Constructor
  constructor(page: Page) {
    this.page = page;
  }
  
  // 4. Navigation methods
  async goto() { }
  
  // 5. Action methods (interactions)
  async clickButton() { }
  async fillForm(data) { }
  
  // 6. Assertion/verification methods
  async expectVisible() { }
  async expectText(text) { }
  
  // 7. Helper/utility methods
  async getText() { }
  async isElementPresent() { }
}
```

### API Page Object Structure

```typescript
export class ApiName {
  // 1. Request context
  private readonly request: APIRequestContext;
  private readonly baseURL: string;
  
  // 2. Constructor
  constructor(request: APIRequestContext, baseURL?: string) {
    this.request = request;
    this.baseURL = baseURL || '';
  }
  
  // 3. API methods (one per endpoint)
  async create(data) { }
  async get(id) { }
  async update(id, data) { }
  async delete(id) { }
  
  // 4. Helper methods
  async verifyResponse(response) { }
  async getErrorDetails(response) { }
}
```

## Naming Conventions

### Class Names
- **Web Pages**: `[PageName]Page` (e.g., `LoginPage`, `DashboardPage`)
- **API Clients**: `[ResourceName]Api` (e.g., `UserApi`, `TemplateApi`)
- **Components**: `[ComponentName]Component` (e.g., `HeaderComponent`)

### Method Names

**Action Methods** (perform actions):
- Use verbs: `click`, `fill`, `select`, `submit`
- Be specific: `clickSubmitButton()` not `click()`
- Examples: `login()`, `fillEmail()`, `selectDropdownOption()`

**Assertion Methods** (verify state):
- Prefix with `expect` or `verify`
- Examples: `expectVisible()`, `verifySuccessMessage()`, `expectErrorText()`

**Query Methods** (return data):
- Prefix with `get` or `is`
- Examples: `getText()`, `getValue()`, `isVisible()`, `isEnabled()`

### Locator Names
- Use nouns describing the element
- Examples: `emailInput`, `submitButton`, `errorMessage`, `userDropdown`
- Suffix with element type: `Input`, `Button`, `Link`, `Checkbox`, etc.

## Locator Strategies

### Priority Order (Best to Worst)

1. **data-testid** (BEST - dedicated for testing)
   ```typescript
   this.page.locator('[data-testid="submit-button"]')
   ```

2. **Unique ID attributes**
   ```typescript
   this.page.locator('#email-input')
   ```

3. **Semantic roles** (accessibility-friendly)
   ```typescript
   this.page.getByRole('button', { name: 'Submit' })
   this.page.getByLabel('Email')
   ```

4. **Unique class combinations**
   ```typescript
   this.page.locator('.form-submit.primary-btn')
   ```

5. **XPath** (AVOID - fragile, slow)
   ```typescript
   // Only as last resort
   this.page.locator('//button[@type="submit"]')
   ```

### Locator Best Practices

✅ **DO:**
```typescript
// Use arrow functions for lazy evaluation
readonly submitButton = (): Locator => this.page.locator('[data-testid="submit"]');

// Chain locators for scoping
readonly form = (): Locator => this.page.locator('form.login-form');
readonly formSubmit = (): Locator => this.form().locator('[type="submit"]');

// Use getByRole for accessibility
readonly submitButton = (): Locator => this.page.getByRole('button', { name: 'Submit' });
```

❌ **DON'T:**
```typescript
// Don't store locators directly (not lazy)
readonly submitButton = this.page.locator('[data-testid="submit"]'); // BAD

// Don't use fragile selectors
readonly button = (): Locator => this.page.locator('div > div > button:nth-child(3)'); // BAD

// Don't use text content as primary selector (can change with i18n)
readonly button = (): Locator => this.page.locator('text=Submit'); // FRAGILE
```

## Method Design

### Action Methods

**Return void** (actions don't need to return values):
```typescript
async login(email: string, password: string): Promise<void> {
  await this.emailInput().fill(email);
  await this.passwordInput().fill(password);
  await this.submitButton().click();
  // Wait for navigation or state change
  await this.page.waitForURL('/dashboard');
}
```

**Chain-able pattern** (return `this` for fluent API):
```typescript
async fillEmail(email: string): Promise<this> {
  await this.emailInput().fill(email);
  return this;
}

async fillPassword(password: string): Promise<this> {
  await this.passwordInput().fill(password);
  return this;
}

// Usage in test:
await loginPage
  .fillEmail('user@test.com')
  .fillPassword('pass123')
  .submit();
```

### Assertion Methods

**Include assertions in Page Object** (when verifying page state):
```typescript
async expectLoginSuccess(): Promise<void> {
  await expect(this.page).toHaveURL('/dashboard');
  await expect(this.welcomeMessage()).toBeVisible();
}

async expectErrorMessage(message: string): Promise<void> {
  await expect(this.errorAlert()).toBeVisible();
  await expect(this.errorAlert()).toHaveText(message);
}
```

**Return data for test assertions** (when test needs to decide):
```typescript
async getErrorMessage(): Promise<string> {
  return await this.errorAlert().textContent() || '';
}

// In test:
const error = await loginPage.getErrorMessage();
expect(error).toContain('Invalid credentials');
```

### Helper Methods

**Keep internal** (mark as private if only used within Page Object):
```typescript
private async waitForFormReady(): Promise<void> {
  await this.emailInput().waitFor({ state: 'visible' });
  await this.passwordInput().waitFor({ state: 'visible' });
}

async login(email: string, password: string): Promise<void> {
  await this.waitForFormReady(); // Internal helper
  await this.fillEmail(email);
  await this.fillPassword(password);
  await this.submitButton().click();
}
```

## Anti-Patterns to Avoid

### ❌ Business Logic in Page Objects

**BAD:**
```typescript
async loginAsAdmin(): Promise<void> {
  // Knows about admin credentials - business logic!
  await this.login('admin@company.com', 'AdminPass123!');
}
```

**GOOD:**
```typescript
async login(email: string, password: string): Promise<void> {
  // Generic login - test provides credentials
  await this.emailInput().fill(email);
  await this.passwordInput().fill(password);
  await this.submitButton().click();
}

// In test:
await loginPage.login(ADMIN_CREDENTIALS.email, ADMIN_CREDENTIALS.password);
```

### ❌ Test Assertions Mixed with Actions

**BAD:**
```typescript
async login(email: string, password: string): Promise<void> {
  await this.emailInput().fill(email);
  await this.passwordInput().fill(password);
  await this.submitButton().click();
  
  // Assertion in action method - BAD!
  await expect(this.page).toHaveURL('/dashboard');
}
```

**GOOD:**
```typescript
async login(email: string, password: string): Promise<void> {
  await this.emailInput().fill(email);
  await this.passwordInput().fill(password);
  await this.submitButton().click();
}

// In test:
await loginPage.login(email, password);
await expect(page).toHaveURL('/dashboard'); // Test controls assertions
```

### ❌ Hard-Coded Waits

**BAD:**
```typescript
async clickSubmit(): Promise<void> {
  await this.submitButton().click();
  await this.page.waitForTimeout(3000); // Hard-coded wait - BAD!
}
```

**GOOD:**
```typescript
async clickSubmit(): Promise<void> {
  await this.submitButton().click();
  await this.page.waitForLoadState('networkidle'); // Smart wait
  // Or wait for specific element:
  await this.successMessage().waitFor({ state: 'visible' });
}
```

### ❌ Returning Page Implementation Details

**BAD:**
```typescript
getEmailInput(): Locator {
  return this.page.locator('#email'); // Exposes Locator - leaky abstraction
}
```

**GOOD:**
```typescript
async getEmailValue(): Promise<string> {
  return await this.emailInput().inputValue(); // Returns data, not implementation
}

async fillEmail(email: string): Promise<void> {
  await this.emailInput().fill(email); // Action method encapsulates interaction
}
```

## Advanced Patterns

### Component Composition

```typescript
// Reusable header component
export class HeaderComponent {
  constructor(private page: Page) {}
  
  readonly logo = (): Locator => this.page.locator('[data-testid="logo"]');
  readonly userMenu = (): Locator => this.page.locator('[data-testid="user-menu"]');
  
  async clickLogo(): Promise<void> {
    await this.logo().click();
  }
  
  async openUserMenu(): Promise<void> {
    await this.userMenu().click();
  }
}

// Page that uses the component
export class DashboardPage {
  readonly header: HeaderComponent;
  
  constructor(private page: Page) {
    this.header = new HeaderComponent(page);
  }
  
  async goHome(): Promise<void> {
    await this.header.clickLogo();
  }
}

// Usage in test:
const dashboard = new DashboardPage(page);
await dashboard.header.openUserMenu();
```

### Base Page Pattern

```typescript
// Base class with common functionality
export class BasePage {
  constructor(protected page: Page) {}
  
  async waitForPageLoad(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
  }
  
  async reload(): Promise<void> {
    await this.page.reload();
  }
  
  async getPageTitle(): Promise<string> {
    return await this.page.title();
  }
}

// Specific pages extend base
export class LoginPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }
  
  async goto(): Promise<void> {
    await this.page.goto('/login');
    await this.waitForPageLoad(); // From BasePage
  }
}
```

### Fluent Interface Pattern

```typescript
export class FormPage {
  constructor(private page: Page) {}
  
  async fillField(field: string, value: string): Promise<this> {
    await this.page.locator(`[name="${field}"]`).fill(value);
    return this;
  }
  
  async selectOption(field: string, option: string): Promise<this> {
    await this.page.locator(`[name="${field}"]`).selectOption(option);
    return this;
  }
  
  async submit(): Promise<void> {
    await this.page.locator('[type="submit"]').click();
  }
}

// Usage - method chaining:
await formPage
  .fillField('name', 'John Doe')
  .fillField('email', 'john@example.com')
  .selectOption('country', 'US')
  .submit();
```

## Testing the Page Objects

Page Objects themselves should be simple enough not to need testing. But if complex:

```typescript
test.describe('LoginPage POM', () => {
  test('should have correct selectors', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    
    // Verify elements are found
    await expect(loginPage.emailInput()).toBeVisible();
    await expect(loginPage.passwordInput()).toBeVisible();
    await expect(loginPage.submitButton()).toBeVisible();
  });
});
```

## Summary Checklist

- [ ] One Page Object per page/component/resource
- [ ] Locators use data-testid or stable attributes
- [ ] Methods have single responsibility
- [ ] No business logic in Page Objects
- [ ] Action methods return void or this (fluent)
- [ ] Assertion methods include expect() statements
- [ ] No hard-coded waits
- [ ] Proper async/await usage
- [ ] TypeScript types specified
- [ ] Meaningful method and variable names
