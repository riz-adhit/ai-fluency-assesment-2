---
name: playwright-automation
description: 'Generate and refactor Playwright automation tests. Use for converting CSV test cases to executable Playwright code, generating Page Object Model classes from specs or UI, or refactoring existing tests to POM pattern. Supports both API and web testing with TypeScript. Includes intelligent data-testid handling (RFC → Figma → AI-generated) and optional Figma design analysis for accurate locator extraction.'
argument-hint: 'Mode (convert|generate-po|refactor) and source file/URL/Figma link'
---

# Playwright Automation

Comprehensive workflow for creating, generating, and refactoring Playwright automation tests following industry best practices and Page Object Model pattern.

## When to Use

- **Converting** manual CSV test cases (Gherkin format) to executable Playwright tests
- **Generating** Page Object Model classes from API specs, URLs, or UI elements
- **Refactoring** existing Playwright tests to follow POM pattern and clean code principles
- **Standardizing** test structure across the automation suite
- **Accelerating** test automation development
- **Fixing flaky tests** by validating selectors against live pages
- **Creating automation for new initiatives/features** with accurate selectors from start

## ⚠️ CRITICAL: Project-Specific Patterns

**THIS PROJECT USES DIFFERENT PATTERNS FOR API vs WEB TESTING**

### API Testing: Helper Class Pattern
Location: `/helper/mob/*.helper.ts`  
Test Location: `/tests/mob/nocode/api/*.spec.ts`

**✅ CORRECT for API tests:**
```typescript
// helper/mob/template-api.helper.ts
export class TemplateAPIHelper {
    private apiURL: string;
    private authToken: string;

    private readonly ENDPOINTS = {
        CREATE: '/v1/nocode/studio/template/create',
        DELETE: '/v1/nocode/studio/template/delete',
    };

    constructor(authToken: string = '', apiURL: string = setup.apiGatewayOfficeless) {
        this.apiURL = apiURL;
        this.authToken = authToken;
    }

    async createTemplate(request: APIRequestContext, projectId: string, name: string) {
        const url = `${this.apiURL}${this.ENDPOINTS.CREATE}`;
        const response = await request.post(url, {
            data: { project_id: projectId, name: name },
            headers: this.getHeaders()
        });
        const responseData = await response.json();
        return { response, responseData };  // Returns destructurable object
    }
}

// tests/mob/nocode/api/api-template.spec.ts
test('Create template', async ({ request }) => {
    const helper = new TemplateAPIHelper(authToken);
    const { response, responseData } = await helper.createTemplate(request, 'proj1', 'My Template');
    expect(response.status()).toBe(200);
});
```

**❌ WRONG for API tests in this project:**
```typescript
// DON'T create "api/*.page.ts" or "pages/api/*.ts"
// DON'T use Page Object pattern for API tests
```

### Web Testing: Page Object Model (POM)
Location: `/pages/mob/*.page.ts`  
Test Location: `/tests/mob/nocode/web/*.spec.ts`

**✅ CORRECT for Web tests:**
```typescript
// pages/mob/login.page.ts
import { Page, Locator } from '@playwright/test';

export class LoginPage {
    constructor(
        public page: Page,
        
        // ===== Login Form =====
        public inputEmail: Locator = page.getByTestId('email-input'),
        public inputPassword: Locator = page.getByTestId('password-input'),
        public btnSubmit: Locator = page.getByRole('button', { name: 'Login' }),
        
        // ===== Messages =====
        public errorMessage: Locator = page.locator('.error-message'),
    ) {}
    
    async login(email: string, password: string): Promise<void> {
        await this.inputEmail.fill(email);
        await this.inputPassword.fill(password);
        await this.btnSubmit.click();
    }
}
```

### 🔐 Login Patterns (CRITICAL!)

**THIS PROJECT HAS 3 DIFFERENT LOGIN FLOWS**

#### **Pattern 1: App Dashboard - Draft Environment**
```typescript
// tests/mob/nocode/app-gen2-*.spec.ts
const appOfficelessDraftUrl = setup.appOfficelessDraftUrl;

test.beforeEach(async ({ page }) => {
    const loginMekariAccount = new LoginPage(page);
    const userDataApp = userAccount['new_admin_app_gen2'][setup.env as EnvType];
    
    await page.goto(appOfficelessDraftUrl + `/${projectId}/${companyId}/login`);
    await waitForElement(page.getByRole('textbox', { name: 'Input email address' }));
    await loginMekariAccount.loginApp(userDataApp.email, userDataApp.otp);
});
```

**Key Characteristics:**
- URL: `appOfficelessDraftUrl + /${projectId}/${companyId}/login`
- Method: `loginApp(email, otp)`
- Use case: Testing draft/unpublished app versions
- File pattern: `app-gen2-*.spec.ts` with "Draft Env" in test name

#### **Pattern 2: App Dashboard - Publish Environment**
```typescript
// tests/mob/nocode/app-gen2-*.spec.ts
const appOfficelessPublishUrl = setup.appOfficelessPublishUrl;

test.beforeEach(async ({ page }) => {
    const loginMekariAccount = new LoginPage(page);
    const userDataApp = userAccount['new_admin_app_gen2'][setup.env as EnvType];
    
    await page.goto(appOfficelessPublishUrl + `/${projectId}/${companyId}/login`);
    await waitForElement(page.getByRole('textbox', { name: 'Input email address' }));
    await loginMekariAccount.loginApp(userDataApp.email, userDataApp.otp);
});
```

**Key Characteristics:**
- URL: `appOfficelessPublishUrl + /${projectId}/${companyId}/login`
- Method: `loginApp(email, otp)` (sama seperti draft)
- Use case: Testing published/production app versions
- File pattern: `app-gen2-*.spec.ts` with "Publish Env" in test name

#### **Pattern 3: Studio (Mekari Builder)**
```typescript
// tests/mob/nocode/studio-gen2-*.spec.ts
const studioMekariBuilderUrl = setup.studioMekariBuilderUrl;

test.beforeEach(async ({ page }) => {
    const loginMekariAccount = new LoginPage(page);
    const userData = userAccount['owner_form_single'][setup.env as EnvType];
    
    await page.goto(studioMekariBuilderUrl);
    await waitForElement(loginMekariAccount.loginButton);
    
    // Option A: Skip OTP (most common)
    await loginMekariAccount.loginStudioSkipOTP(userData.email, userData.password);
    
    // Option B: With OTP input
    await loginMekariAccount.loginAs(userData.email, userData.password, userData.otp);
});
```

**Key Characteristics:**
- URL: `studioMekariBuilderUrl` (no project/company path)
- Method: `loginStudioSkipOTP(email, password)` or `loginAs(email, password, otp)`
- Use case: Testing studio/builder configuration pages
- File pattern: `studio-gen2-*.spec.ts`

### 📋 Decision Tree for Login Pattern

```
Q: What is being tested?
├─ "App Dashboard" mentioned in CSV?
│  ├─ "Draft" or "Draft Env"? → Use loginApp() + appOfficelessDraftUrl
│  └─ "Publish" or "Publish Env"? → Use loginApp() + appOfficelessPublishUrl
│
└─ "Studio" or "Mekari Builder" mentioned?
   └─ Use loginStudioSkipOTP() + studioMekariBuilderUrl
```

### 🎯 How to Identify from CSV Test Cases

**CSV indicators:**

| CSV Contains | Login Pattern | URL | Method |
|--------------|---------------|-----|--------|
| "Draft Env", "Draft Version" | App Dashboard Draft | `appOfficelessDraftUrl` | `loginApp(email, otp)` |
| "Publish Env", "Publish Version", "Production" | App Dashboard Publish | `appOfficelessPublishUrl` | `loginApp(email, otp)` |
| "Studio", "Mekari Builder", "Setup", "Configuration" | Studio Builder | `studioMekariBuilderUrl` | `loginStudioSkipOTP(email, password)` |

**Example CSV rows:**

```csv
Title: "Single Page Request - Draft Env: Update button pre-process"
→ Use App Dashboard Draft pattern

Title: "Single Page Request - Publish Env: Submit button validation"
→ Use App Dashboard Publish pattern

Title: "Studio Setup Form: Configure approval workflow"
→ Use Studio pattern
```

### ⚠️ Common Mistakes to Avoid

❌ **Using Studio login for App Dashboard tests**
```typescript
// WRONG!
await page.goto(appOfficelessDraftUrl + '/login');
await loginMekariAccount.loginStudioSkipOTP(email, password); // ❌
```

❌ **Missing project/company path for App Dashboard**
```typescript
// WRONG!
await page.goto(appOfficelessDraftUrl); // ❌ Missing /${projectId}/${companyId}/login
```

❌ **Using Draft URL for Publish tests**
```typescript
// WRONG! CSV says "Publish Env" but using Draft URL
await page.goto(appOfficelessDraftUrl + '/login'); // ❌ Should use appOfficelessPublishUrl
```

✅ **Correct Pattern Recognition:**
```typescript
// CSV: "Trigger Update Button Pre-Process on Draft Version"
// ✅ Identified: Draft Env → Use loginApp() + appOfficelessDraftUrl

const appOfficelessDraftUrl = setup.appOfficelessDraftUrl;
await page.goto(appOfficelessDraftUrl + `/${projectId}/${companyId}/login`);
await loginMekariAccount.loginApp(email, otp);
```

### Key Differences

| Aspect | API Tests (Helper) | Web Tests (POM) |
|--------|-------------------|-----------------|
| **Pattern** | Helper class | Page Object Model |
| **Location** | `/helper/mob/` | `/pages/mob/` |
| **Constructor** | `(authToken, apiURL)` | `(page)` |
| **Methods return** | `{ response, responseData }` | `void` or `Promise<void>` |
| **First parameter** | `request: APIRequestContext` | N/A (uses `this.page`) |
| **Test imports helper** | `new Helper(token)` | `new PageObject(page)` |

**BEFORE generating code, examine existing files to understand the pattern!**
- For API: Read files in `/helper/mob/` and `/tests/mob/nocode/api/`
- For Web: Read files in `/pages/mob/` and `/tests/mob/nocode/web/`

## Page Object Locator Strategy 🎯

**Purpose**: Generate stable, automation-friendly locators for Playwright Page Objects following project conventions.

### Page Object Structure Pattern

**CRITICAL**: Follow the constructor-with-locators pattern from this project:

```typescript
// pages/mob/example.page.ts
import { Page, Locator } from '@playwright/test';

export class ExamplePage {
    constructor(
        public page: Page,

        // ===== Section Name =====
        public locatorName: Locator = page.locator('[data-testid="element-id"]'),
        public buttonSubmit: Locator = page.getByRole('button', { name: 'Submit' }),
        
        // ===== Dynamic Locators =====
        public getItemByName: (name: string) => Locator = (name: string) => 
            page.locator(`[data-testid="item-${name}"]`),
    ) {}

    /**
     * Action methods go here
     */
    async performAction(): Promise<void> {
        await this.buttonSubmit.click();
    }
}
```

**Key Principles:**
1. **Locators in constructor parameters** with default values
2. **Group related locators** with comment headers (e.g., `// ===== Navigation =====`)
3. **Use `public`** for all page and locator properties
4. **Methods outside constructor** for actions and verifications
5. **Dynamic locators** use arrow functions: `(param: string) => Locator`

### Locator Naming & Selection Priority

When generating Page Object locators, follow this priority:

**1. RFC/PRD First** ✅ Highest Priority
- Check if `data-testid` is specified in RFC/PRD documentation
- Check CSV test cases for data-testid mentions
- Use EXACT data-testid value as documented
- **Selector**: `page.getByTestId('element-id')` or `page.locator('[data-testid="element-id"]')`

```typescript
// ✅ From RFC: data-testid="submit-template-btn"
public btnSubmit: Locator = page.getByTestId('submit-template-btn'),
```

**2. Live Page Inspection Second** 🔍 If not in RFC
- Ask user for live page URL
- Use MCP Playwright to inspect real DOM (if available)
- Discover existing data-testid, ARIA roles, labels
- **Selectors**: Choose based on what's found on page:
  - Has data-testid → `page.getByTestId('element-id')`
  - Has ARIA role → `page.getByRole('button', { name: 'Submit' })`
  - Has label → `page.getByLabel('Email address')`
  - Has visible text → `page.getByText('Button Label')`

```typescript
// 🔍 From live page: data-testid found during inspection
public btnSubmit: Locator = page.getByTestId('submit-btn'),

// 🔍 From live page: ARIA role with accessible name
public inputEmail: Locator = page.getByLabel('Email address'),
```

**3. Figma Third** 🎨 If no live page available
- Connect to Figma using MCP and analyze design
- Check Figma Dev Mode for data-testid attributes
- Use visual context to select best locator strategy
- **Selectors**: Choose based on element:
  - Text visible to user → `page.getByText('Button Label')`
  - Role-based (button, link, heading) → `page.getByRole('button', { name: 'Submit' })`
  - ARIA label → `page.getByLabel('Email address')`
  - Generic → `page.locator('css-selector')`

```typescript
// 🎨 From Figma visual: "Add Filter" button (primary button, top-right)
public btnAddFilter: Locator = page.getByRole('button', { name: 'Add Filter' }),

// 🎨 From Figma: Modal dialog title
public modalTitle: Locator = page.getByRole('heading', { name: 'Create Template' }),
```

**4. AI Generation Fourth** 🤖 Last Resort
- If data-testid is NOT in RFC/CSV AND NOT on live page AND NOT in Figma
- **Property name** uses prefix: `ai_generate_[type]_[purpose]_[context]`
- **Selector** uses best available strategy based on context
- Add JSDoc comment explaining what needs to be implemented

```typescript
/**
 * 🤖 AI-Generated Locators
 * These locators need verification or data-testid implementation.
 * Recommendation: Inspect live page or add data-testid attributes
 */

// AI-generated: Filter drawer container (slides from right)
public ai_generate_drawer_filter: Locator = page.locator('[role="dialog"]').filter({ hasText: 'Filter' }),

// AI-generated: Close button (X icon in modal)
public ai_generate_btn_close_modal: Locator = page.getByRole('button', { name: /close|×/i }),
```

### Locator Property Naming Convention

**Pattern**: `[prefix_]type_purpose_context`

**Prefixes:**
- *(none)* - From RFC/PRD with data-testid
- *(none)* - From Figma with clear selector
- `ai_generate_` - Generated by AI, needs verification

**Type Prefixes:**
- `btn` - Button
- `input` - Input field
- `dropdown` / `select` - Dropdown/select
- `checkbox` - Checkbox
- `radio` - Radio button
- `toggle` - Toggle switch
- `modal` - Modal dialog
- `drawer` - Side drawer/panel
- `icon` - Icon button
- `link` - Link/anchor
- `label` - Label text
- `error` - Error message
- `menu` - Menu/navigation

**Examples:**

| UI Element | Source | Property Name | Selector |
|------------|--------|--------------|----------|
| Submit button | RFC data-testid | `btnSubmit: Locator` | `page.getByTestId('submit-btn')` |
| Email input | RFC data-testid | `inputEmail: Locator` | `page.getByTestId('email-input')` |
| Name input | Live page (has label) | `inputName: Locator` | `page.getByLabel('Full Name')` |
| Login button | Live page (ARIA role) | `btnLogin: Locator` | `page.getByRole('button', { name: 'Login' })` |
| "Add Filter" button | Figma (visible text) | `btnAddFilter: Locator` | `page.getByRole('button', { name: 'Add Filter' })` |
| Filter drawer | Figma (dialog role) | `drawerFilter: Locator` | `page.getByRole('dialog')` |
| Close icon | AI-generated | `ai_generate_btn_close: Locator` | `page.getByRole('button', { name: /close/i })` |
| Error message | AI-generated | `ai_generate_error_invalid: Locator` | `page.getByText(/invalid|error/i).first()` |

### Complete Page Object Example

```typescript
// pages/mob/database-filter.page.ts
import { Page, Locator } from '@playwright/test';

/**
 * DatabaseFilterPage
 * 
 * Generated from:
 * - RFC data-testid: data-table
 * - Live page inspection: https://app.example.com/database (2026-04-17)
 * - Figma design: https://figma.com/design/xxx?node-id=123-456
 * - Frames analyzed: 1-7
 * 
 * ⚠️ LOCATOR NOTES:
 * - Properties with 'ai_generate_' prefix need verification
 * - Visual reference: See Figma frames for element placement
 * - Recommended: Add data-testid attributes for ai_generate_ locators
 */
export class DatabaseFilterPage {
    constructor(
        public page: Page,

        // ===== Main View =====
        // ✅ From RFC
        public dataTable: Locator = page.getByTestId('data-table'),
        
        // 🔍 From live page: Found ARIA role + accessible name
        public btnAddFilter: Locator = page.getByRole('button', { name: 'Add Filter' }),
        
        // ===== Filter Drawer =====
        // 🔍 From live page: Dialog with ARIA role
        public drawerFilter: Locator = page.getByRole('dialog'),
        
        // 🤖 AI-generated: Schema dropdown in drawer (not found in live page or Figma)
        public ai_generate_dropdown_schema: Locator = page.locator('select').first(),
        
        // 🎨 From Figma: Primary button in drawer
        public btnApplyFilter: Locator = page.getByRole('button', { name: 'Apply' }),
        
        // 🔍 From live page: Secondary button
        public btnCancel: Locator = page.getByRole('button', { name: 'Cancel' }),
        
        // ===== Error States =====
        // 🤖 AI-generated: Error message below input (suggest adding data-testid)
        public ai_generate_error_message: Locator = page.locator('.error-message').first(),
        
        // ===== Dynamic Locators =====
        public getFilterRow: (filterName: string) => Locator = (filterName: string) =>
            page.locator(`[data-testid="filter-row-${filterName}"]`),
    ) {}

    /**
     * Open filter drawer
     * Visual: Frame 1 → Frame 2 transition
     */
    async openFilterDrawer(): Promise<void> {
        await this.btnAddFilter.click();
        await this.drawerFilter.waitFor({ state: 'visible' });
    }

    /**
     * Select schema for filtering
     * Visual: Frame 3, dropdown interaction
     */
    async selectSchema(schemaName: string): Promise<void> {
        await this.ai_generate_dropdown_schema.selectOption(schemaName);
    }

    /**
     * Apply selected filter
     * Visual: Frame 4-5, success flow
     */
    async applyFilter(): Promise<void> {
        await this.btnApplyFilter.click();
        await this.drawerFilter.waitFor({ state: 'hidden' });
    }

    /**
     * Verify error message is displayed
     * Visual: Frame 6, error state
     */
    async verifyErrorDisplayed(expectedMessage: string): Promise<boolean> {
        await this.ai_generate_error_message.waitFor({ state: 'visible' });
        const text = await this.ai_generate_error_message.textContent();
        return text?.includes(expectedMessage) ?? false;
    }
}
```

## Three Modes

### Mode 1: Convert (CSV → Playwright) ⭐ PRIMARY
Convert Gherkin CSV test cases to executable Playwright test files.

**Input:** CSV file with test cases (API_Test_Cases_*.csv or Web_Test_Cases_*.csv)  
**Output:** Playwright spec files + Page Object classes

**🔍 ALWAYS ASK FIRST:**
```
For Page Object generation, do you have:
1. Live page URL for inspection? (most accurate via MCP Playwright)
2. Figma design URL? (visual context via MCP Figma)
3. Neither - use AI generation from CSV description

Your choice: [1/2/3]
```

**Use when:**
- You have manual test cases in CSV format
- Need to automate existing test plans
- Want to maintain traceability (CSV test ID → automated test)

### Mode 2: Generate Page Objects
Generate POM classes from specifications or live applications.

**Input:** API spec (OpenAPI/Swagger), webpage URL, Figma design, or manual list of elements  
**Output:** Page Object TypeScript classes

**🔍 ALWAYS ASK FIRST:**
```
What source do you want to use for Page Object generation?
1. Live page URL (inspect real DOM via MCP Playwright) ⭐ Most accurate
2. Figma design URL (visual context via MCP Figma)
3. API specification (OpenAPI/Swagger)
4. Manual element specification

Your choice: [1/2/3/4]
```

**Use when:**
- Starting new test automation
- Standardizing Page Object structure
- Need boilerplate for new features

### Mode 3: Refactor to POM
Transform existing non-POM tests into clean POM-based tests.

**Input:** Existing Playwright test files  
**Output:** Refactored tests + extracted Page Objects

**Use when:**
- Legacy tests need improvement
- Code review identified POM violations
- Consolidating duplicate selectors/logic

---

## Real-World Use Cases 🌟

### Use Case 1: Fixing Flaky Tests 🔧

**Scenario:** Test sudah ada (dibuat 6 bulan lalu), tapi sekarang sering fail/flaky.

**Problem:**
```typescript
// pages/mob/dashboard.page.ts (dibuat 6 bulan lalu)
export class DashboardPage {
    constructor(
        public page: Page,
        
        // Selector lama (mungkin sudah berubah)
        public btnCreateProject: Locator = page.locator('#create-btn'),
        public projectList: Locator = page.locator('.project-list'),
    ) {}
}

// Test jadi flaky karena selector sudah tidak valid!
```

**Solution: Live Page Inspection untuk Validate**

```
/playwright-automation validate-selectors

Input: pages/mob/dashboard.page.ts
Live URL: https://staging.app.example.com/dashboard

🔍 Inspecting live page to validate selectors...

Results:
❌ btnCreateProject: page.locator('#create-btn')
   → Element NOT FOUND on live page
   ✅ Suggestion: page.getByTestId('dashboard-create-project-btn')
   
❌ projectList: page.locator('.project-list')
   → Multiple elements found (3 matches)
   ✅ Suggestion: page.getByTestId('user-projects-list')

✅ Auto-fix applied to Page Object
✅ All selectors now match live DOM
```

**Fixed Page Object:**
```typescript
export class DashboardPage {
    constructor(
        public page: Page,
        
        // ✅ Updated after live inspection (2026-04-17)
        public btnCreateProject: Locator = page.getByTestId('dashboard-create-project-btn'),
        
        // ✅ Fixed: more specific selector
        public projectList: Locator = page.getByTestId('user-projects-list'),
    ) {}
}
```

**Benefits:**
- ✅ **Root cause identified** - selector mismatch, bukan logic issue
- ✅ **Quick fix** - 2 minutes inspection vs 30 minutes debugging
- ✅ **Preventive** - validate all selectors at once
- ✅ **Documentation** - timestamp when selector was validated

---

### Use Case 2: New Initiative/Feature Automation 🚀

**Scenario:** PM announce initiative baru "Multi-Workspace Support". QA perlu buat automation.

**Timeline-Based Approach:**

#### **Phase 1: Design Stage (Week 1-2)** 🎨

Developer baru mulai coding, tapi Figma design sudah ready.

```
/playwright-automation generate-po

Source: Figma design
URL: https://figma.com/design/xxx?node-id=workspace-selector
Page name: WorkspaceSelectorPage
Output: pages/mob/workspace-selector.page.ts

🎨 Generating from Figma design (feature not deployed yet)...

✅ Generated WorkspaceSelectorPage
⚠️ Properties marked with ai_generate_ need verification when deployed
📝 Add to backlog: Validate selectors after staging deployment
```

**Generated (Early Stage):**
```typescript
export class WorkspaceSelectorPage {
    constructor(
        public page: Page,
        
        // 🎨 From Figma: Dropdown component
        public dropdownWorkspace: Locator = page.getByRole('combobox', { name: 'Select Workspace' }),
        
        // 🤖 AI-generated: Switch button (tidak ada detail di Figma)
        public ai_generate_btn_switch: Locator = page.getByRole('button', { name: /switch|change/i }),
    ) {}
}
```

**Benefits:**
- ✅ **Early preparation** - QA bisa mulai planning test cases
- ✅ **Collaboration** - QA bisa feedback ke developer tentang testability
- ✅ **Parallel work** - Developer code, QA prepare framework

#### **Phase 2: Staging Deployment (Week 3)** 🔍

Feature sudah deployed ke staging, saatnya validate!

```
/playwright-automation validate-and-update

Input: pages/mob/workspace-selector.page.ts
Live URL: https://staging.app.example.com/workspace

🔍 Validating against live staging page...

Results:
✅ dropdownWorkspace: Confirmed on live page
   → Has data-testid="workspace-selector-dropdown" (even better!)
   
✅ ai_generate_btn_switch: Found on live page
   → Has data-testid="workspace-switch-btn"
   
🎯 Updating Page Object with accurate selectors...
```

**Updated (After Staging):**
```typescript
export class WorkspaceSelectorPage {
    constructor(
        public page: Page,
        
        // ✅ Updated from live inspection (2026-04-17)
        // 🔍 Found data-testid on staging
        public dropdownWorkspace: Locator = page.getByTestId('workspace-selector-dropdown'),
        
        // ✅ Was ai_generate_, now validated from live page
        public btnSwitch: Locator = page.getByTestId('workspace-switch-btn'),
    ) {}
}
```

**Benefits:**
- ✅ **Zero rework** - Page Object structure sudah benar dari Phase 1
- ✅ **High accuracy** - 100% valid selectors from live page
- ✅ **Fast deployment** - Test automation ready bersamaan dengan feature
- ✅ **No flaky tests** - Accurate selectors from day 1

#### **Phase 3: Production & Maintenance** ✅

Test sudah running di CI/CD, monitoring for flaky tests.

```
Monthly validation (automated):
✅ WorkspaceSelectorPage validated on: 2026-05-17
✅ All selectors still valid
✅ No changes detected
```

---

### Use Case 3: Bulk Flaky Test Fix 🚨

**Scenario:** 50 tests jadi flaky setelah major UI refactor.

**Before (Manual Debugging):**
```
Time: 50 tests × 30 min = 25 hours
Approach: Debug one by one
Result: Inconsistent fixes, some still flaky
```

**After (Live Inspection Batch):**
```
/playwright-automation bulk-validate

Input: tests/mob/nocode/web/*.spec.ts
Live URL: https://staging.app.example.com

📊 Analysis:
- 50 flaky tests identified
- 8 unique Page Objects involved
- Estimated fix time: 20 minutes

🔍 Batch validation of 8 Page Objects...

Results:
✅ LoginPage: All selectors valid
❌ DashboardPage: 3 selectors need update
❌ ProfilePage: 2 selectors need update
❌ SettingsPage: 5 selectors need update
✅ ReportsPage: All selectors valid
...

🎯 Auto-fixing 10 outdated selectors...

✅ Fixed 50 tests by updating 8 Page Objects
⏱️ Time: 22 minutes vs 25 hours manual
📈 Success rate: 98% (49/50 tests now passing)
```

---

### Use Case 4: New Team Member Onboarding 👥

**Scenario:** Junior QA join team, perlu buat automation untuk "Invoice Export" feature.

**Traditional Approach:**
```
1. Junior inspect page manually (1 hour, many mistakes)
2. Write selectors based on guessing (30 min)
3. Senior review and fix (1 hour)
4. Flaky tests discovered (2 hours debugging)
Total: 4.5 hours + rework
```

**With Live Inspection:**
```
Junior QA:
/playwright-automation generate-po

Live URL: https://staging.app.example.com/invoices
Page name: InvoiceExportPage

✅ Generated with 100% accurate selectors (5 minutes)
✅ Senior review: Approved immediately
✅ Tests running stable from day 1
Total: 15 minutes + learning experience
```

**Benefits:**
- ✅ **Faster onboarding** - Less trial and error
- ✅ **Best practices** - Learn correct patterns from generated code
- ✅ **Confidence** - Junior knows selectors are accurate
- ✅ **Less senior review time** - Code quality is consistent

---

## TestRail Test Case ID Convention

### ⚠️ CRITICAL: Remove "C" Prefix from TestRail IDs in Spec Files

TestRail exports test case IDs with a leading `C` (e.g., `C5731456`).
When generating `test()` names and JSON `caseNumber` fields, **always strip the `C` prefix**.

| Context | Format | Example |
|---|---|---|
| CSV / TestRail | `C5731456` | raw export |
| `test()` name in spec.ts | `5731456-description @p0` | **no C prefix** |
| `caseNumber` in JSON data | `"5731456"` | **no C prefix** |
| `id` in JSON data | `"C5731456"` | keep C (for reference only) |

**✅ Correct test name format:**
```typescript
test('5731456-[Dev] Security - Fetch records on deleted project application is blocked @p0', ...)
```

**❌ Wrong (never use C prefix in test name):**
```typescript
test('C5731456-[Dev] Security - ...', ...)  // ❌
test('TC_6 - [Dev] Security - ...', ...)    // ❌ placeholder format
```

**Reason:** Playwright and most CI reporters use the `test()` name as identifier.
Keeping the pure numeric ID ensures consistent matching with TestRail reports without `C` collision.

---

## Mode 1: CSV to Playwright Conversion (Detailed)

### Prerequisites

**CSV Format Requirements:**
- Gherkin format (Given/When/Then) in columns: Precondition, Steps, Expected Result
- Title column with test scenario name
- Priority column (P0/P1/P2)
- Reference column (for traceability)

**Example CSV Row:**
```csv
Title: "As a User, I should process API request for Login - Valid credentials"
Precondition: "Given I have valid user credentials"
Steps: "When I send POST request to /api/auth/login with body {email: 'user@test.com'; password: 'pass123'}"
Expected Result: "Then I receive HTTP 200 OK response and response body contains {token: <value>; user_id: <value>}"
```

### Conversion Workflow

#### Step 1: Analyze CSV File

**Read and parse CSV:**
- Extract all test cases
- Group by feature/endpoint (based on Title analysis)
- Identify test type: API vs Web vs Integration
- Categorize by priority for test suite organization
- **🔐 Detect login pattern from CSV keywords** (Draft/Publish/Studio)

**Pattern Recognition:**
- Identify common Page Objects needed (based on endpoints/pages mentioned)
- Extract API endpoints and HTTP methods
- Identify authentication requirements
- Detect test data patterns
- **🔐 Map test cases to correct login pattern and environment**

**🔥 CRITICAL: Login Pattern Detection**

**Step 1a: Scan CSV for Environment Keywords**

```
CSV Analysis for Login Pattern:
├── Search Title column for keywords:
│   ├─ "Draft Env" OR "Draft Version" → App Dashboard Draft
│   ├─ "Publish Env" OR "Publish Version" OR "Production" → App Dashboard Publish
│   └─ "Studio" OR "Mekari Builder" OR "Setup" → Studio Builder
│
└── Validate with Tags column:
    ├─ "@staging" + "Draft" → Confirmed Draft
    ├─ "@production" → Confirmed Publish
    └─ "@officeless-studio" → Confirmed Studio
```

**Example CSV Analysis:**

```csv
Row 1:
Title: "Single Page Request - Detail Form: Update Button on Draft Version"
Tags: "@mob @staging @officeless-app @form-single-approval"
→ Detected: Draft Env (keyword: "Draft Version")
→ Login: loginApp() + appOfficelessDraftUrl
→ User: new_admin_app_gen2

Row 51:
Title: "Single Page Request - Detail Form: Submit Button on Publish Version"
Tags: "@mob @production @officeless-app @form-single-approval"
→ Detected: Publish Env (keywords: "Publish Version" + "@production")
→ Login: loginApp() + appOfficelessPublishUrl
→ User: new_admin_app_gen2

Row 101:
Title: "Studio Setup Form: Configure Update Button Pre-Process"
Tags: "@mob @staging @officeless-studio @mekari-builder-dashboard"
→ Detected: Studio (keywords: "Studio Setup" + "@officeless-studio")
→ Login: loginStudioSkipOTP() + studioMekariBuilderUrl
→ User: owner_form_single
```

**Output Summary:**

```
Login Pattern Distribution:
├─ App Dashboard Draft: 50 tests
├─ App Dashboard Publish: 50 tests
└─ Studio Builder: 20 tests

Generated Test Files:
├─ app-gen2-form-interaction-draft.spec.ts (50 tests)
├─ app-gen2-form-interaction-publish.spec.ts (50 tests)
└─ studio-gen2-form-setup.spec.ts (20 tests)
```

**🔥 CRITICAL for Large Test Suites (100+ test cases):**

**Step 1a: Group Test Cases by Unique Pages**

Before generating ANY code, analyze CSV to find unique pages:

```
Analysis of 200 test cases:
├── 15 tests on Login page (/login)
├── 25 tests on Dashboard (/dashboard)
├── 20 tests on Profile (/profile)
├── 30 tests on Settings (/settings)
├── 18 tests on Reports (/reports)
├── 22 tests on User Management (/users)
├── 15 tests on API endpoints (API Helper)
├── 35 tests on Forms (/forms/*)
└── 20 tests on Search (/search)

Result: 10 unique pages + 1 API helper
```

**Step 1b: Ask for Live Pages (Batch Inspection)**

```
📊 Found 200 test cases covering 10 unique pages.

Do you have live URLs for inspection? (Recommended for accuracy)
1. YES - Provide staging/production URLs (20 min total for 10 pages)
2. NO - Use Figma designs (if available)
3. PARTIAL - Some pages live, others use Figma/AI

Recommended: Option 1 for maximum accuracy and time savings.
```

**Time Comparison:**

| Approach | Time | Accuracy | Maintenance |
|----------|------|----------|-------------|
| Live inspection (10 pages) | 20 min | 95% | Low |
| Figma (10 designs) | 1 hour | 85% | Medium |
| AI generation (200 cases) | 6 hours | 60% | High |
| **Hybrid (Recommended)** | **2 hours** | **90%** | **Low** |

**Workflow for Batch Processing:**

```typescript
// For each unique page:
1. Live inspection → Generate Page Object (if URL available)
2. Fallback to Figma → Generate from design (if no URL)
3. AI generation → Only for unique elements not in live/Figma

// For each test case:
1. Reuse existing Page Object
2. Focus on test logic (Given/When/Then)
3. Extract test data to data files
```

**Example Output for 200 Test Cases:**

```
Generated Files:
├── pages/mob/
│   ├── login.page.ts           # Reused by 15 tests
│   ├── dashboard.page.ts       # Reused by 25 tests
│   ├── profile.page.ts         # Reused by 20 tests
│   ├── settings.page.ts        # Reused by 30 tests
│   └── ... (6 more pages)
├── helper/mob/
│   └── api-helper.ts           # Reused by 15 API tests
├── tests/mob/nocode/web/
│   ├── login.spec.ts           # 15 test cases
│   ├── dashboard.spec.ts       # 25 test cases
│   └── ... (8 more files)
└── data/mob/
    ├── login-data.ts           # Test data for 15 cases
    ├── dashboard-data.ts       # Test data for 25 cases
    └── ... (8 more files)

Total: 10 Page Objects + 15 spec files + 10 data files
Time saved: 14.7 hours (vs manual approach)
```

#### Step 2: Generate Helper Classes (API) or Page Objects (Web)

**For API Tests - Use Helper Class Pattern:**

Create API Helper classes in `/helper/mob/`:

```typescript
// helper/mob/auth-api.helper.ts
import { expect, APIRequestContext } from '@playwright/test';
import { setup } from '../../lib/mob/setup';

export class AuthAPIHelper {
    private apiURL: string;
    private authToken: string;

    private readonly ENDPOINTS = {
        LOGIN: '/api/auth/login',
        LOGOUT: '/api/auth/logout',
        REFRESH: '/api/auth/refresh',
    };

    public readonly ERROR_MESSAGES = {
        UNAUTHORIZED: 'unauthorized',
        INVALID_CREDENTIALS: 'invalid credentials',
    };

    constructor(authToken: string = '', apiURL: string = setup.apiGatewayOfficeless) {
        this.apiURL = apiURL;
        this.authToken = authToken;
    }

    setAuthToken(token: string): void {
        this.authToken = token;
    }

    private getHeaders(includeAuth: boolean = true): Record<string, string> {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };
        if (includeAuth && this.authToken) {
            headers['Authorization'] = `Bearer ${this.authToken}`;
        }
        return headers;
    }

    async login(request: APIRequestContext, email: string, password: string) {
        const url = `${this.apiURL}${this.ENDPOINTS.LOGIN}`;
        const response = await request.post(url, {
            data: { email, password },
            headers: this.getHeaders(false)  // No auth for login
        });
        const responseData = await response.json();
        return { response, responseData };
    }

    async logout(request: APIRequestContext) {
        const url = `${this.apiURL}${this.ENDPOINTS.LOGOUT}`;
        const response = await request.post(url, {
            headers: this.getHeaders()
        });
        const responseData = await response.json();
        return { response, responseData };
    }

    // Verification helpers
    verifySuccessResponse(response: any, responseData: any): void {
        expect(response.status()).toBe(200);
        expect(responseData.error).toBe(false);
    }

    verifyErrorResponse(response: any, responseData: any, expectedStatus: number): void {
        expect(response.status()).toBe(expectedStatus);
        expect(responseData.error).toBe(true);
    }
}
```

**For Web Tests:**
Create Page Object classes:

```typescript
// pages/mob/login.page.ts
import { Page, Locator } from '@playwright/test';

export class LoginPage {
    constructor(
        public page: Page,
        
        // ===== Login Form =====
        public inputEmail: Locator = page.getByTestId('email-input'),
        public inputPassword: Locator = page.getByTestId('password-input'),
        public btnSubmit: Locator = page.getByRole('button', { name: 'Login' }),
    ) {}
    
    async login(email: string, password: string): Promise<void> {
        await this.inputEmail.fill(email);
        await this.inputPassword.fill(password);
        await this.btnSubmit.click();
    }
}
```

#### Step 3: Generate Test Specifications

**Map CSV to Playwright Test:**

**CSV Input:**
```csv
Title: "As a User, I should trigger Update button on Draft Version"
Priority: P0
Type: Functional
Environment: Draft
Tags: "@mob @staging @officeless-app"
```

**🔐 Login Pattern Detection:**
```
Keywords found: "Draft Version", "@staging"
→ Environment: App Dashboard Draft
→ URL: appOfficelessDraftUrl
→ Login: loginApp(email, otp)
→ User Account: new_admin_app_gen2
```

**Generated Playwright Test (App Dashboard - Draft):**
```typescript
// tests/mob/nocode/app-gen2-form-interaction-draft.spec.ts
import { test, expect } from '../../../lib/hook';
import { waitForElement } from '../../../helper/basic';
import { setup } from '../../../lib/mob/setup';
import { type EnvType } from '../../../lib/enum';

// Pages
import { LoginPage } from '../../../pages/mob/login.page';
import { DashboardAppsGen2Page } from '../../../pages/mob/dashboard_apps_gen2.page';

// Data
import InteractionSingle from '../../../data/mob/form_interaction_single.json';
import userAccount from '../../../config/mob/users.json';
import TestConstants from '../../../data/mob/form_interaction_constants.json';

const appOfficelessDraftUrl = setup.appOfficelessDraftUrl; // ✅ Draft URL

test.describe('Form Interaction Single - Draft Env @mob @staging @officeless-app', () => {

    test.beforeEach(async ({ page }) => {
        const loginMekariAccount = new LoginPage(page);
        const userDataApp = userAccount['new_admin_app_gen2'][setup.env as EnvType]; // ✅ Correct user
        const interactionSingle = InteractionSingle[setup.env as EnvType];

        // ✅ App Dashboard Draft login pattern
        await page.goto(
            appOfficelessDraftUrl + 
            `/${interactionSingle.project.id}/${interactionSingle.project.company_id}/login`
        );
        await waitForElement(page.getByRole('textbox', { name: 'Input email address' }));
        await loginMekariAccount.loginApp(userDataApp.email, userDataApp.otp); // ✅ loginApp method
        
        // Navigate to form
        await page.locator('[data-testid="app-item"]')
            .filter({ hasText: /^Form Single$/ })
            .click();
    });

    test('[P0] Update button should show confirmation on Draft Version', async ({ page }) => {
        /**
         * CSV Test Case: Row 1 - Form_Interaction_Draft_20260417.csv
         * Title: As a User, I should trigger Update button on Draft Version
         * Priority: P0
         * Environment: Draft
         */
        
        const dashboardAppsGen2Page = new DashboardAppsGen2Page(page);
        
        // Given: User navigates to form record
        await dashboardAppsGen2Page.navigateToFormRecord('Requester', 'Sample Data');
        
        // When: User clicks Update button
        await dashboardAppsGen2Page.clickButtonWithConfirmation(
            'Update', 
            'Confirmation Title', 
            'Are you sure?'
        );
        
        // Then: Confirmation message appears
        await expect(page.getByText('Updated successfully')).toBeVisible();
    });
});
```

**For Studio Tests:**

**CSV Input:**
```csv
Title: "Studio Setup: Configure Update Button Pre-Process Confirmation"
Tags: "@mob @staging @officeless-studio"
```

**🔐 Login Pattern Detection:**
```
Keywords found: "Studio Setup", "@officeless-studio"
→ Environment: Studio Builder
→ URL: studioMekariBuilderUrl
→ Login: loginStudioSkipOTP(email, password)
→ User Account: owner_form_single
```

**Generated Playwright Test (Studio):**
```typescript
// tests/mob/nocode/studio-gen2-form-setup.spec.ts
import { test, expect } from '../../../lib/hook';
import { waitForElement } from '../../../helper/basic';
import { setup } from '../../../lib/mob/setup';
import { type EnvType } from '../../../lib/enum';

// Pages
import { LoginPage } from '../../../pages/mob/login.page';
import { DashboardStudioGen2Page } from '../../../pages/mob/studio_gen2_dashboard.page';
import { LayoutStudioGen2Page } from '../../../pages/mob/studio_gen2_page.page';

// Data
import InteractionSingle from '../../../data/mob/studio_form_interaction.json';
import userAccount from '../../../config/mob/users.json';

const studioMekariBuilderUrl = setup.studioMekariBuilderUrl; // ✅ Studio URL

test.describe('Studio Setup Form Interaction @mob @staging @officeless-studio', () => {

    test.beforeEach(async ({ page }) => {
        const loginMekariAccount = new LoginPage(page);
        const dashboardStudioGen2Page = new DashboardStudioGen2Page(page);
        const userData = userAccount['owner_form_single'][setup.env as EnvType]; // ✅ Studio user

        // ✅ Studio login pattern
        await page.goto(studioMekariBuilderUrl);
        await waitForElement(loginMekariAccount.loginButton);
        await loginMekariAccount.loginStudioSkipOTP(userData.email, userData.password); // ✅ Studio method

        // Verify login success
        await waitForElement(dashboardStudioGen2Page.lbl_myProject);
        await expect(page.getByTestId('navbar-profile')
            .getByText(userData.company_name)).toBeVisible();
    });

    test('[P0] Setup Update Button Pre-Process Confirmation', async ({ page }) => {
        /**
         * CSV Test Case: Row 101 - Studio_Form_Setup_20260417.csv
         * Title: Studio Setup: Configure Update Button Pre-Process Confirmation
         * Priority: P0
         * Environment: Studio
         */
        
        const layoutStudioGen2Page = new LayoutStudioGen2Page(page);
        const interactionSingle = InteractionSingle[setup.env as EnvType];

        // Given: Navigate to page builder
        await page.goto(
            `${studioMekariBuilderUrl}/my-projects/` +
            `${interactionSingle.project.id}/` +
            `${interactionSingle.project.app_id}/` +
            `page-builder/${interactionSingle.page_id}/` +
            `single/${interactionSingle.single_id}/detail_view`
        );

        // When: Setup native button with confirmation
        await layoutStudioGen2Page.setupNativeButtonWithConfirmation(
            layoutStudioGen2Page.nativeButtonUpdate,
            'Update',
            interactionSingle.hidden,
            interactionSingle.preprocess,
            interactionSingle.postprocess.function
        );

        // Then: Verify button configuration
        await page.reload();
        await layoutStudioGen2Page.verifyNativeButtonSetup(
            layoutStudioGen2Page.nativeButtonUpdate,
            'Update',
            interactionSingle.hidden,
            interactionSingle.preprocess,
            interactionSingle.postprocess.function
        );
    });
});
```

**For API Tests - Use Helper Class Pattern (No Login Pattern Dependency):**
```typescript
// tests/mob/nocode/api/api-auth.spec.ts
import { test, expect } from '../../../../lib/hook';
import { setup } from '../../../../lib/mob/setup';
import { type EnvType } from '../../../../lib/enum';
import userAccount from '../../../../config/mob/users.json';
import { LoginPage } from '../../../../pages/mob/login.page';
import { getTokenFromLocalStorage } from '../../../../helper/mob/api-helper';
import { AuthAPIHelper } from '../../../../helper/mob/auth-api.helper';

const apiURL = setup.apiGatewayOfficeless;
const studioGen2Url = setup.studioMekariBuilderUrl;

let authorizationToken: string;
let authAPIHelper: AuthAPIHelper;

test.describe('Auth - Login API @nocode-service @staging @auth @api @mob', () => {
    test.beforeAll(async ({ browser }) => {
        const page = await browser.newPage();
        const loginMekariAccount = new LoginPage(page);
        const userDataStudio = userAccount['admin_studio_gen2'][setup.env as EnvType];

        await page.goto(studioGen2Url);
        await loginMekariAccount.loginStudioSkipOTP(userDataStudio.email, userDataStudio.password);

        const tokenValue = await getTokenFromLocalStorage(page, 'token');
        const tokenObj = JSON.parse(tokenValue as string);
        authorizationToken = tokenObj.value;

        // Initialize API Helper
        authAPIHelper = new AuthAPIHelper(authorizationToken);

        await page.close();
    });

    test('[P0] Valid credentials should return token', async ({ request }) => {
        // Given: I have valid user credentials
        const credentials = {
            email: 'user@test.com',
            password: 'pass123'
        };

        // When: I send POST request to /api/auth/login
        const { response, responseData } = await authAPIHelper.login(
            request,
            credentials.email, 
            credentials.password
        );

        // Then: I receive HTTP 200 OK response
        authAPIHelper.verifySuccessResponse(response, responseData);
        
        // And: response body contains token and user_id
        expect(responseData.data).toHaveProperty('token');
        expect(responseData.data).toHaveProperty('user_id');
        expect(responseData.data.token).toBeTruthy();
    });
});
```

#### Step 4: Include Test Data Management

**Extract test data patterns from CSV:**

Create test data files:
```typescript
// tests/data/auth.data.ts
export const AUTH_TEST_DATA = {
  validUser: {
    email: 'user@test.com',
    password: 'ValidPass123!'
  },
  invalidEmail: {
    email: 'invalid-email',
    password: 'pass123'
  },
  missingPassword: {
    email: 'user@test.com',
    password: ''
  }
};
```

Reference in tests:
```typescript
import { AUTH_TEST_DATA } from '../data/auth.data';

test('Valid credentials', async () => {
  const response = await authApi.login(
    AUTH_TEST_DATA.validUser.email,
    AUTH_TEST_DATA.validUser.password
  );
  // ...
});
```

#### Step 5: Organize Test Files

**File Structure (THIS PROJECT):**
```
tests/mob/nocode/
├── api/                          # API test specs
│   ├── api-template-creation.spec.ts
│   ├── api-template-deletion.spec.ts
│   ├── api-auth.spec.ts
│   └── api-multi-apps.spec.ts
└── web/                          # Web test specs (if any)
    ├── login.spec.ts
    └── dashboard.spec.ts

helper/mob/                       # API Helper classes (NOT Page Objects!)
├── template-api.helper.ts
├── auth-api.helper.ts
├── external-source-api.helper.ts
└── api-helper.ts                 # Shared utilities

data/mob/                         # Test data
├── template-api.json
├── multi-apps.json
└── studio_project.json

pages/mob/                        # Web Page Objects ONLY
├── login.page.ts
└── dashboard.page.ts

config/mob/                       # Configuration
└── users.json

lib/mob/                          # Test setup & utilities
└── setup.ts
```

**CRITICAL File Placement Rules:**
- ✅ API tests → `/tests/mob/nocode/api/*.spec.ts`
- ✅ API helpers → `/helper/mob/*.helper.ts`
- ❌ DO NOT create `/api/` or `/pages/api/` directories
- ✅ Web Page Objects → `/pages/mob/*.page.ts`
- ✅ Test data → `/data/mob/*.json`

#### Step 6: Add Traceability Comments

**Link CSV test case to automated test:**
```typescript
test('[P0][REF:MOB-6942] Valid credentials should return token', async () => {
  /**
   * CSV Test Case: Row 15 - API_Test_Cases_Auth_20260414.csv
   * Title: As a User, I should process API request for Login - Valid credentials
   * Priority: P0
   * Reference: MOB-6942
   */
  
  // Test implementation...
});
```

### Conversion Best Practices

**1. Maintain Gherkin Structure in Comments:**
```typescript
test('scenario', async () => {
  // Given: [precondition from CSV]
  
  // When: [action from CSV]
  
  // Then: [expected result from CSV]
});
```

**2. Use CSV Priority in Test Tags:**
- P0 tests → include in smoke suite
- P1 tests → regression suite
- P2 tests → extended suite

**3. Extract Reusable Logic:**
- Common setup → test fixtures
- Common validations → helper functions
- Common data → test data files

**4. Handle CSV-Specific Patterns:**
- Replace semicolons with proper syntax
- Parse JSON-like structures in CSV  
- Convert "and" to multiple statements

---

## Mode 2: Generate Page Objects (Quick Guide)

### ⚡ Quick Start: Ask for Live Page URL First

**ALWAYS ask at the beginning of Page Object generation:**

```
Do you have a live page URL for inspection?
- YES → Use MCP Playwright for live page inspection (most accurate)
- NO → Use Figma design or manual specification
```

**Priority order for Page Object generation:**
1. **Live page URL** (via MCP Playwright) - Most accurate, real DOM inspection
2. **Figma design** (via MCP Figma) - Visual context, before implementation
3. **Manual specification** - Fallback when neither available

### From Live Web Page URL 🎯 (Recommended)

**Input:** Live web application URL

**Output:** Page Object classes with real DOM-based locators

**Use when:**
- Application is already deployed (staging/production)
- Need accurate selectors from actual implementation
- Want to verify what's actually rendered

**Prerequisites:**
⚠️ **REQUIRES MCP Playwright server** (if not available, fallback to Figma/manual)

**Workflow:**

**Step 1: Check MCP Playwright Availability**
```typescript
// Search for MCP Playwright tools
tool_search("playwright browser navigate inspect elements")

// If not found → inform user and offer alternatives:
// - Use Figma design URL instead
// - Provide manual element specification
```

**Step 2: Navigate to Live Page**
```typescript
// Tool: mcp_playwright_navigate (if available)
Input: URL
Purpose: Open page in browser context
```

**Step 3: Extract DOM Elements**
```typescript
// Tool: mcp_playwright_get_elements (if available)
Output: List of interactive elements with:
  - Element type (button, input, select, etc.)
  - Visible text
  - Existing data-testid (if present)
  - CSS selectors
  - ARIA roles and labels
  - Position in DOM
```

**Step 4: Generate Page Object with Real Selectors**

Follow locator selection priority:
1. ✅ **data-testid found on page** → Use `page.getByTestId()`
2. ✅ **ARIA role + accessible name** → Use `page.getByRole()`
3. ✅ **Label association** → Use `page.getByLabel()`
4. ✅ **Visible text** → Use `page.getByText()`
5. ⚠️ **Fallback CSS selector** → Use `page.locator()` with property prefix `ai_generate_`

**Example Output (with MCP Playwright):**
```typescript
// pages/mob/contact-form.page.ts
import { Page, Locator } from '@playwright/test';

/**
 * ContactFormPage
 * 
 * Generated from live page: https://app.example.com/contact
 * Inspected on: 2026-04-17
 * 
 * ✅ All locators verified against live DOM
 */
export class ContactFormPage {
    constructor(
        public page: Page,

        // ===== Form Fields =====
        // ✅ Found data-testid="contact-name-input" on live page
        public inputName: Locator = page.getByTestId('contact-name-input'),
        
        // ✅ Found ARIA label "Email address"
        public inputEmail: Locator = page.getByLabel('Email address'),
        
        // ✅ Button with role="button" and accessible name "Submit"
        public btnSubmit: Locator = page.getByRole('button', { name: 'Submit' }),
        
        // ⚠️ No data-testid or ARIA, using CSS selector
        public ai_generate_error_message: Locator = page.locator('.form-error').first(),
    ) {}

    async fillContactForm(name: string, email: string): Promise<void> {
        await this.inputName.fill(name);
        await this.inputEmail.fill(email);
    }

    async submit(): Promise<void> {
        await this.btnSubmit.click();
    }
}
```

**Benefits of Live Page Inspection:**
- ✅ **100% accurate selectors** from real DOM
- ✅ **Discovers existing data-testid** attributes
- ✅ **Validates ARIA accessibility** (roles, labels)
- ✅ **No guessing** - sees actual implementation
- ✅ **Faster automation** - skip manual inspection
- ✅ **Scales efficiently** - inspect once, reuse for multiple test cases
- ✅ **Reduces maintenance** - accurate selectors = fewer fixes

**When to Use Live Inspection:**
- ✅ Application deployed to staging/production
- ✅ Generating Page Objects for existing features
- ✅ Large test suites (100+ test cases) with page reuse
- ✅ Need maximum accuracy and minimum maintenance
- ✅ Team wants to validate actual implementation

**When NOT to Use Live Inspection:**
- ❌ Feature not yet implemented (use Figma for early prep)
- ❌ Only have localhost (no shared staging URL)
- ❌ Page requires complex authentication flow (use Figma/manual)
- ❌ Frequent UI changes in development (wait until stable)
- ❌ Very simple forms (AI generation sufficient)

**Fallback if MCP Playwright Not Available:**
```
⚠️ MCP Playwright not configured in this environment.

Alternative options:
1. Provide Figma design URL for visual-based generation
2. Manually specify element list
3. Setup MCP Playwright server (requires configuration)

Which would you prefer?
```

### From API Specification (OpenAPI/Swagger)

**Input:** OpenAPI spec JSON/YAML

**Output:** API client classes

**Workflow:**
1. Parse OpenAPI spec
2. Extract endpoints, methods, parameters
3. Generate TypeScript interface for request/response
4. Create API client class with methods
5. Include authentication handling
6. Add JSDoc comments from spec descriptions

### From Figma Design 🎨

**Input:** Figma design URL with node-id

**Output:** Page Object classes with accurate locators

**Use when:**
- Design mockups are available before implementation
- Need to prepare automation framework early
- Want visual context for meaningful locator names
- CSV test cases reference Figma designs

**Prerequisites:**
⚠️ **MUST connect to MCP Figma first before viewing nodes**

**Workflow:**

**Step 1: Connect to Figma via MCP**
```
Tool: mcp_figma_add_figma_file
Input: Complete Figma URL
Purpose: Establish MCP connection and authentication
```

**Example:**
```
URL: https://www.figma.com/design/xA1bC2dE3fG4hI5jK6lM7?node-id=24661-317677
↓
Call: mcp_figma_add_figma_file(file_url="https://www.figma.com/design/xA1bC2dE3fG4hI5jK6lM7?node-id=24661-317677")
```

**Step 2: Extract URL Components**
```
URL Format: https://www.figma.com/design/[FILE_KEY]?node-id=[NODE_ID]

Extract:
- file_key: xA1bC2dE3fG4hI5jK6lM7 (after /design/)
- node_id_url: 24661-317677 (from URL parameter, with hyphen)
- node_id_api: 24661:317677 (convert hyphen to colon for API)
```

⚠️ **Important**: URL uses hyphen `24661-317677`, but API requires colon `24661:317677`

**Step 3: View Figma Node**
```
Tool: mcp_figma_view_node
Input: 
  - file_key: "xA1bC2dE3fG4hI5jK6lM7"
  - node_id: "24661:317677" (with colon!)
```

**Step 4: Analyze UI Components**

Extract from Figma:
- [ ] **Interactive elements**: buttons, inputs, dropdowns, toggles
- [ ] **Exact text labels**: button text, placeholders, labels
- [ ] **data-testid attributes** (if present in Figma Dev Mode)
- [ ] **Visual hierarchy**: positioning, grouping, primary/secondary actions
- [ ] **UI states**: default, hover, active, disabled, error
- [ ] **Component behaviors**: modals, drawers, tooltips
- [ ] **Layout context**: top-right, bottom, sidebar, etc.

**Step 5: Handle Multiple Frames**

If Figma link points to a group/parent node with multiple frames:

1. **View parent node first** to see overview
2. **Analyze each frame individually** for detailed UI elements
3. **Map frames to Page Object sections**:
   - Frame 1-2: Initial state → Base locators
   - Frame 3-5: Interaction flow → Action methods
   - Frame 6-7: Error states → Error locators

**Automatic Frame Iteration:**
When group has multiple frames, analyze each frame systematically without waiting for user to specify individual frames.

**Step 6: Generate Page Object with Locator Selection Priority**

Follow locator selection priority order:
1. Check if RFC/CSV mentions data-testid → Use `page.getByTestId()`
2. Check Figma for visual context → Use appropriate selector (`getByRole`, `getByText`, etc.)
3. If AI generates → Use `ai_generate_` prefix for property name, choose best selector

**Example Output:**
```typescript
// pages/mob/database-filter.page.ts
import { Page, Locator } from '@playwright/test';

/**
 * DatabaseFilterPage
 * 
 * Generated from Figma: https://figma.com/design/xxx?node-id=123-456
 * Frames analyzed: 1-7
 * 
 * ⚠️ LOCATOR NOTES:
 * - Properties with 'ai_generate_' prefix need verification
 * - Visual reference: See Figma frames for element placement
 * - Recommended: Add data-testid attributes for ai_generate_ locators
 */
export class DatabaseFilterPage {
    constructor(
        public page: Page,

        // ===== Main View (Frame 1) =====
        // ✅ From RFC
        public dataTable: Locator = page.getByTestId('data-table'),
        
        // 🎨 From Figma visual: Primary button "Add Filter" (top-right)
        public btnAddFilter: Locator = page.getByRole('button', { name: 'Add Filter' }),
        
        // ===== Filter Drawer (Frame 2-3) =====
        // 🎨 From Figma: Dialog role
        public drawerFilter: Locator = page.getByRole('dialog'),
        
        // 🤖 AI-generated: Schema dropdown in drawer (needs data-testid)
        public ai_generate_dropdown_schema: Locator = page.locator('select').first(),
        
        // 🎨 From Figma: Primary button in drawer
        public btnApplyFilter: Locator = page.getByRole('button', { name: 'Apply' }),
        
        // ===== Error States (Frame 6) =====
        // 🤖 AI-generated: Error message (suggest adding data-testid)
        public ai_generate_error_invalid: Locator = page.getByText(/invalid|error/i).first(),
    ) {}

    /**
     * Open filter drawer
     * Visual: Frame 1 → Frame 2 transition
     */
    async openFilterDrawer(): Promise<void> {
        await this.btnAddFilter.click();
        await this.drawerFilter.waitFor({ state: 'visible' });
    }

    /**
     * Select schema for filtering
     * Visual: Frame 3, dropdown interaction
     */
    async selectSchema(schemaName: string): Promise<void> {
        await this.ai_generate_dropdown_schema.selectOption(schemaName);
    }

    /**
     * Apply selected filter
     * Visual: Frame 4-5, success flow
     */
    async applyFilter(): Promise<void> {
        await this.btnApplyFilter.click();
        await this.drawerFilter.waitFor({ state: 'hidden' });
    }

    /**
     * Verify error message is displayed
     * Visual: Frame 6, error state
     */
    async verifyErrorDisplayed(expectedMessage: string): Promise<boolean> {
        await this.ai_generate_error_invalid.waitFor({ state: 'visible' });
        const text = await this.ai_generate_error_invalid.textContent();
        return text?.includes(expectedMessage) ?? false;
    }
}
```

**Benefits of Figma-based Generation:**
- ✅ Accurate locator names based on actual design
- ✅ Visual context improves test maintainability
- ✅ Early automation preparation (before implementation)
- ✅ Better collaboration between QA and developers
- ✅ Clear documentation with Figma frame references
- ✅ Intelligent selector choice (role, text, testid based on context)

**Handling Large Frame Groups (20+ frames):**
- Inform user of total frame count
- Ask if they want full analysis or filtered by feature/flow
- Default: For <20 frames, analyze all automatically

### Manual Specification

**Input:** List of elements/endpoints

**Output:** Page Object skeleton

**Workflow:**
1. Review provided specification
2. Create class structure
3. Add locator/method stubs
4. Include TODO comments for completion

---

## Mode 3: Refactor to POM (Quick Guide)

### Refactoring Workflow

**Input:** Existing Playwright test with inline selectors

**Before:**
```typescript
test('login', async ({ page }) => {
  await page.goto('/login');
  await page.locator('#email').fill('user@test.com');
  await page.locator('#password').fill('pass123');
  await page.locator('button[type="submit"]').click();
  await expect(page.locator('.welcome')).toBeVisible();
});
```

**After:**
```typescript
// pages/mob/login.page.ts
import { Page, Locator } from '@playwright/test';

export class LoginPage {
    constructor(
        public page: Page,
        
        // ===== Login Form =====
        public inputEmail: Locator = page.locator('#email'),
        public inputPassword: Locator = page.locator('#password'),
        public btnSubmit: Locator = page.locator('button[type="submit"]'),
        
        // ===== Messages =====
        public welcomeMessage: Locator = page.locator('.welcome'),
    ) {}
    
    async goto(): Promise<void> {
        await this.page.goto('/login');
    }
    
    async login(email: string, password: string): Promise<void> {
        await this.inputEmail.fill(email);
        await this.inputPassword.fill(password);
        await this.btnSubmit.click();
    }
    
    async expectWelcomeVisible(): Promise<void> {
        await this.welcomeMessage.waitFor({ state: 'visible' });
    }
}

// tests/login.spec.ts
test('login', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('user@test.com', 'pass123');
    await loginPage.expectWelcomeVisible();
});
  await loginPage.login('user@test.com', 'pass123');
  await loginPage.expectWelcomeVisible();
});
```

**Steps:**
1. Identify all page interactions
2. Extract to Page Object methods
3. Group by page/feature
4. Update test to use Page Objects
5. Remove inline selectors from test
6. Add type safety and reusability

---

## Quality Checklist

### For Real-World Scenarios
- [ ] **For Flaky Tests**: Validated selectors against live page before debugging test logic
- [ ] **For New Features**: Used Figma in design phase, validated with live inspection after staging deploy
- [ ] **For Bulk Fixes**: Grouped by Page Objects, fixed once and reused across tests
- [ ] **For Onboarding**: Generated Page Objects with live inspection to teach best practices
- [ ] **Identified correct login pattern** from CSV (Draft/Publish/Studio)
- [ ] **Used correct URL** for environment (appOfficelessDraftUrl vs appOfficelessPublishUrl vs studioMekariBuilderUrl)
- [ ] **Used correct login method** (loginApp vs loginStudioSkipOTP vs loginAs)
- [ ] **Documented validation timestamp** in Page Object JSDoc
- [ ] **Tracked selector changes** in git history for auditing
- [ ] **Scheduled periodic validation** for critical Page Objects

### For Large Test Suites (100+ test cases)
- [ ] **Analyzed CSV to find unique pages** (group before generating)
- [ ] **Asked for live page URLs** for batch inspection
- [ ] **Prioritized live inspection** for most-used pages
- [ ] **Reused Page Objects** across multiple test cases
- [ ] **Documented page-to-tests mapping** (e.g., LoginPage used by tests 1-15)
- [ ] **Batch-generated data files** per page/feature
- [ ] **Estimated time savings** vs manual approach
- [ ] **Fallback strategy documented** (live → Figma → AI)

### For Generated Tests
- [ ] All CSV test cases converted
- [ ] Gherkin structure preserved in comments
- [ ] Priority tags included
- [ ] Traceability maintained (CSV row reference)
- [ ] Test data externalized
- [ ] Page Objects created for common elements/APIs
- [ ] Authentication/setup in fixtures
- [ ] Assertions cover all "Then" statements from CSV

### For Page Objects
- [ ] One class per page/API resource
- [ ] Descriptive method names
- [ ] **Public `page` property** in constructor
- [ ] **Locators declared in constructor parameters** with default values
- [ ] **Grouped by sections** with comment headers (e.g., `// ===== Navigation =====`)
- [ ] No business logic in Page Objects (only interactions)
- [ ] **Asked for live page URL at start** (before using Figma/AI fallback)
- [ ] **Locator selection follows priority: RFC data-testid → Live page → Figma context → AI-generated**
- [ ] **AI-generated locators use property name prefix `ai_generate_`** (not data-testid)
- [ ] **Best selector strategy used**: `getByTestId`, `getByRole`, `getByText`, `locator` based on context
- [ ] **Developer documentation comment** for ai_generate_ locators
- [ ] **Source documented in class JSDoc** (RFC/live page/Figma references)
- [ ] Return types specified (`Promise<void>`, etc.)
- [ ] **Dynamic locators** use arrow functions: `(param: string) => Locator`
- [ ] **Connected to MCP (Playwright/Figma) before inspection** (if using MCP tools)

### For Code Quality
- [ ] TypeScript strict mode compatible
- [ ] ESLint compliant
- [ ] Consistent naming conventions
- [ ] Proper async/await usage
- [ ] Error handling for API calls
- [ ] Timeouts configured appropriately

---

## Common Patterns & Solutions

### Pattern 0: Identify Login Pattern from CSV 🔐

**CSV Test Case Analysis:**

**Example 1: Draft Environment**
```csv
Title: "Single Page Request - Detail Form: Trigger Update Button on Draft Version"
Precondition: "Given user is logged in to draft app"
```

**Generated beforeEach:**
```typescript
import { setup } from '../../../lib/mob/setup';
import userAccount from '../../../config/mob/users.json';
import { LoginPage } from '../../../pages/mob/login.page';

const appOfficelessDraftUrl = setup.appOfficelessDraftUrl;

test.beforeEach(async ({ page }) => {
    const loginMekariAccount = new LoginPage(page);
    const userDataApp = userAccount['new_admin_app_gen2'][setup.env as EnvType];
    const interactionData = InteractionSingle[setup.env as EnvType];
    
    // ✅ Identified from CSV: "Draft Version" → Use Draft URL + loginApp
    await page.goto(
        appOfficelessDraftUrl + 
        `/${interactionData.project.id}/${interactionData.project.company_id}/login`
    );
    await waitForElement(page.getByRole('textbox', { name: 'Input email address' }));
    await loginMekariAccount.loginApp(userDataApp.email, userDataApp.otp);
});
```

**Example 2: Publish Environment**
```csv
Title: "Single Page Request - Detail Form: Trigger Submit Button on Publish Version"
Tags: "@production @officeless-app"
```

**Generated beforeEach:**
```typescript
const appOfficelessPublishUrl = setup.appOfficelessPublishUrl;

test.beforeEach(async ({ page }) => {
    const loginMekariAccount = new LoginPage(page);
    const userDataApp = userAccount['new_admin_app_gen2'][setup.env as EnvType];
    const interactionData = InteractionSingle[setup.env as EnvType];
    
    // ✅ Identified from CSV: "Publish Version" + "@production" → Use Publish URL
    await page.goto(
        appOfficelessPublishUrl + 
        `/${interactionData.project.id}/${interactionData.project.company_id}/login`
    );
    await waitForElement(page.getByRole('textbox', { name: 'Input email address' }));
    await loginMekariAccount.loginApp(userDataApp.email, userDataApp.otp);
});
```

**Example 3: Studio/Builder**
```csv
Title: "Studio Setup Form: Configure Update Button Pre-Process Confirmation"
Precondition: "Given user is logged in to Mekari Officeless Studio"
```

**Generated beforeEach:**
```typescript
const studioMekariBuilderUrl = setup.studioMekariBuilderUrl;

test.beforeEach(async ({ page }) => {
    const loginMekariAccount = new LoginPage(page);
    const userData = userAccount['owner_form_single'][setup.env as EnvType];
    
    // ✅ Identified from CSV: "Studio Setup" → Use Studio URL + loginStudioSkipOTP
    await page.goto(studioMekariBuilderUrl);
    await waitForElement(loginMekariAccount.loginButton);
    await loginMekariAccount.loginStudioSkipOTP(userData.email, userData.password);
    
    // Verify logged in
    await waitForElement(dashboardStudioGen2Page.lbl_myProject);
    await expect(page.getByTestId('navbar-profile')
        .getByText(userData.company_name)).toBeVisible();
});
```

**CSV Keywords → Login Pattern Mapping:**

| CSV Keywords | Environment | URL Variable | Login Method | User Account Key |
|--------------|-------------|--------------|--------------|------------------|
| "Draft Env", "Draft Version" | App Draft | `appOfficelessDraftUrl` | `loginApp(email, otp)` | `new_admin_app_gen2` |
| "Publish Env", "Publish Version", "@production" | App Publish | `appOfficelessPublishUrl` | `loginApp(email, otp)` | `new_admin_app_gen2` |
| "Studio", "Mekari Builder", "Setup" | Studio | `studioMekariBuilderUrl` | `loginStudioSkipOTP(email, password)` | `owner_form_single` |

### Pattern 1: CSV Has Multiple "And" Statements

**CSV:**
```
Steps: "When I fill in email and I fill in password and I click submit"
```

**Generated Code:**
```typescript
await loginPage.emailInput().fill(email);
await loginPage.passwordInput().fill(password);
await loginPage.submitButton().click();
```

### Pattern 2: CSV Has JSON-Like Data (with semicolons)

**CSV:**
```
Steps: "When I send POST with body {name: 'Test'; status: 'active'}"
```

**Generated Code:**
```typescript
const response = await api.create({
  name: 'Test',
  status: 'active'
});
```

### Pattern 3: CSV References Previous Steps

**CSV:**
```
Precondition: "Given user is logged in"
Steps: "When I create template with name 'My Template'"
```

**Generated Code:**
```typescript
test.beforeEach(async ({ page }) => {
  // Given: user is logged in
  await authFixture.login(page);
});

test('create template', async ({ page }) => {
  // When: I create template
  const templatePage = new TemplatePage(page);
  await templatePage.create('My Template');
});
```

### Pattern 4: CSV Mentions data-testid

**CSV:**
```csv
Steps: "When I click button with data-testid='submit-contact-btn'"
```

**Generated Page Object:**
```typescript
export class ContactPage {
    constructor(
        public page: Page,
        
        // ✅ data-testid from CSV/RFC
        public btnSubmit: Locator = page.getByTestId('submit-contact-btn'),
    ) {}
}
```

**Generated Test:**
```typescript
await contactPage.btnSubmit.click();
```

### Pattern 5: AI-Generated Locator (No data-testid available)

**CSV:**
```csv
Steps: "When I click the filter button in top-right corner"
Docs: "🤖 No data-testid available - Generated from visual description"
```

**Generated Page Object:**
```typescript
export class FilterPage {
    constructor(
        public page: Page,
        
        /**
         * 🤖 AI-generated locator
         * Context: Primary button in top-right corner labeled "Add Filter"
         * Recommendation: Add data-testid="btn-add-filter" for better stability
         */
        public ai_generate_btn_add_filter: Locator = page.getByRole('button', { name: 'Add Filter' }),
    ) {}
}
```

### Pattern 6: Generate from Live Page URL 🔍

**Input:**
```
Live page URL: https://app.example.com/contact-form
```

**Workflow:**
```typescript
// Step 1: Check MCP Playwright availability
const tools = await tool_search("playwright browser navigate inspect elements");

if (!tools || tools.length === 0) {
  // Fallback: Offer alternatives
  console.log("⚠️ MCP Playwright not available. Alternatives:");
  console.log("1. Provide Figma design URL");
  console.log("2. Manual element specification");
  return;
}

// Step 2: Navigate to live page
await mcp_playwright_navigate({
  url: "https://app.example.com/contact-form"
});

// Step 3: Inspect DOM elements
const elements = await mcp_playwright_get_elements({
  selector: "interactive" // buttons, inputs, links, etc.
});

// Step 4: Analyze discovered elements
// Found:
// - <input data-testid="contact-name" aria-label="Full Name" />
// - <input type="email" aria-label="Email address" />
// - <button type="submit">Send Message</button>
// - <div class="error-message" /> (no data-testid or ARIA)

// Step 5: Generate Page Object with appropriate selectors
```

**Generated Output:**
```typescript
import { Page, Locator } from '@playwright/test';

/**
 * ContactFormPage
 * 
 * Generated from live page: https://app.example.com/contact-form
 * Inspected on: 2026-04-17 15:30 UTC
 * 
 * ✅ All locators verified against live DOM
 */
export class ContactFormPage {
    constructor(
        public page: Page,
        
        // ===== Contact Form =====
        // 🔍 Found data-testid="contact-name" on live page
        public inputName: Locator = page.getByTestId('contact-name'),
        
        // 🔍 Found ARIA label "Email address"
        public inputEmail: Locator = page.getByLabel('Email address'),
        
        // 🔍 Button with type="submit" and text "Send Message"
        public btnSubmit: Locator = page.getByRole('button', { name: 'Send Message' }),
        
        // ===== Messages =====
        // 🤖 AI-generated: No data-testid or ARIA (recommend adding data-testid="contact-error")
        public ai_generate_error_message: Locator = page.locator('.error-message').first(),
    ) {}

    async fillContactForm(name: string, email: string): Promise<void> {
        await this.inputName.fill(name);
        await this.inputEmail.fill(email);
    }

    async submit(): Promise<void> {
        await this.btnSubmit.click();
    }

    async getErrorMessage(): Promise<string | null> {
        return await this.ai_generate_error_message.textContent();
    }
}
```

**Benefits vs Figma/AI:**
- ✅ 100% accurate - inspects real DOM
- ✅ Discovers existing data-testid attributes automatically
- ✅ Validates ARIA accessibility (for better selectors)
- ✅ No guessing - sees actual implementation
- ✅ Faster than manual inspection

### Pattern 7: Generate from Figma Design

**Input:**
```
Figma URL: https://www.figma.com/design/xxx?node-id=123-456
```

**Workflow:**
```typescript
// Step 1: Connect to MCP Figma
await mcp_figma_add_figma_file("https://www.figma.com/design/xxx?node-id=123-456");

// Step 2: View Figma node
const design = await mcp_figma_view_node({
  file_key: "xxx",
  node_id: "123:456"  // Convert hyphen to colon
});

// Step 3: Analyze UI elements from design
// - Button "Add Filter" in top-right (visible text)
// - Email input field with placeholder "Enter email" (has label)
// - Side drawer container (dialog role)
// - data-testid="filter-drawer" found in Figma Dev Mode

// Step 4: Generate Page Object with appropriate selectors
```

**Generated Output:**
```typescript
import { Page, Locator } from '@playwright/test';

export class FilterPage {
    constructor(
        public page: Page,
        
        // 🎨 From Figma Dev Mode: has data-testid
        public drawerFilter: Locator = page.getByTestId('filter-drawer'),
        
        // 🎨 From Figma visual: Button with text "Add Filter"
        public btnAddFilter: Locator = page.getByRole('button', { name: 'Add Filter' }),
        
        // 🎨 From Figma: Input with label "Email address"
        public inputEmail: Locator = page.getByLabel('Email address'),
        
        // 🤖 AI-generated: No clear way to select, suggest data-testid
        public ai_generate_icon_close: Locator = page.locator('button[aria-label="Close"]'),
    ) {}
}
```

---

## Templates & Assets

- [API Page Object Template](./templates/api-page-object.template.ts)
- [Web Page Object Template](./templates/web-page-object.template.ts)
- [Test Spec Template](./templates/test-spec.template.ts)
- [Test Data Template](./templates/test-data.template.ts)

## Reference Documentation

- [Page Object Model Best Practices](./references/pom-best-practices.md)
- [Playwright TypeScript Guide](./references/playwright-typescript.md)
- [Test Organization Strategies](./references/test-organization.md)

---

## Example Usage

### Convert CSV with Login Pattern Detection 🔐

```
/playwright-automation convert

Source: Form_Interaction_Test_Cases.csv

📊 CSV Analysis:
- Row 1-50: "Draft Env" detected → App Dashboard Draft
- Row 51-100: "Publish Env" detected → App Dashboard Publish  
- Row 101-120: "Studio Setup" detected → Studio Builder

🔍 Generating tests with correct login patterns...

Generated Files:

✅ tests/mob/nocode/app-gen2-form-interaction-draft.spec.ts
   - Login: loginApp() + appOfficelessDraftUrl
   - User: new_admin_app_gen2
   - 50 test cases

✅ tests/mob/nocode/app-gen2-form-interaction-publish.spec.ts
   - Login: loginApp() + appOfficelessPublishUrl
   - User: new_admin_app_gen2
   - 50 test cases

✅ tests/mob/nocode/studio-gen2-form-setup.spec.ts
   - Login: loginStudioSkipOTP() + studioMekariBuilderUrl
   - User: owner_form_single
   - 20 test cases

✅ No login pattern errors detected!
```

### Fix Flaky Tests (Validate Selectors) 🔧

```
/playwright-automation validate-selectors

Input: pages/mob/dashboard.page.ts
Live URL: https://staging.app.example.com/dashboard

🔍 Validating 15 selectors against live page...

Results:
✅ 12 selectors valid
❌ 3 selectors outdated:
   - btnCreateProject: #create-btn → data-testid="dashboard-create-btn"
   - projectList: .project-list → data-testid="user-projects"
   - filterDropdown: select.filter → role=combobox name="Filter"

Apply fixes? [Y/n]: Y

✅ Page Object updated
✅ 8 flaky tests now passing
⏱️ Time saved: 2 min validation vs 4 hours debugging
```

### New Feature Automation (2-Phase Approach) 🚀

**Phase 1: Design Stage (Figma)**
```
/playwright-automation generate-po

Source: Figma
URL: https://figma.com/design/xxx?node-id=multi-workspace
Page name: WorkspaceSelectorPage

🎨 Generating from Figma design...
✅ Created pages/mob/workspace-selector.page.ts
⚠️ 2 locators need validation after staging deploy
📝 Added TODO: Validate after deployment
```

**Phase 2: Staging Validation (Live)**
```
/playwright-automation validate-and-update

Input: pages/mob/workspace-selector.page.ts
Live URL: https://staging.app.example.com/workspace

🔍 Validating against live staging...
✅ All Figma-based locators confirmed
✅ Found data-testid attributes (even better!)
✅ Updated 2 ai_generate_ locators with live selectors
✅ Ready for test case implementation
```

### Bulk Flaky Test Fix 🚨

```
/playwright-automation bulk-validate

Input: tests/mob/nocode/web/*.spec.ts (50 flaky tests)
Live URL: https://staging.app.example.com

📊 Analyzing flaky tests...
- 8 Page Objects involved
- 10 outdated selectors identified

🔍 Batch validation and auto-fix...
✅ Fixed 50 tests in 22 minutes
✅ Success rate: 98% (49/50 passing)

Remaining issue (1 test):
- SettingsPage.saveButton: Element requires user interaction before visible
  → Recommendation: Add waitFor() before click
```

### Convert 200 CSV Test Cases (Batch Processing) 🔥

```
/playwright-automation convert

Source: API_Test_Cases_Project_Complete_200cases.csv

📊 Analysis Results:
- Total test cases: 200
- Unique pages identified: 10
- API endpoints: 5
- Estimated time with live inspection: 2 hours
- Estimated time without: 16 hours

Do you have live URLs for the following pages?
1. Login (/login) - used by 15 tests
2. Dashboard (/dashboard) - used by 25 tests
3. Profile (/profile) - used by 20 tests
4. Settings (/settings) - used by 30 tests
5. Reports (/reports) - used by 18 tests
... (5 more)

Your staging URL: https://staging.app.example.com

✅ Proceeding with live inspection for maximum accuracy...

Generated:
✅ 10 Page Objects (from live inspection)
✅ 5 API Helpers
✅ 15 spec files (200 tests organized by feature)
✅ 10 test data files

Time taken: 22 minutes
Time saved: 15.4 hours vs manual approach
Accuracy: 95% (live DOM inspection)
```

### Convert CSV to Playwright

```
/playwright-automation convert

Source: API_Test_Cases_Template_RFC_20260414.csv
Output directory: tests/api/templates/
Generate Page Objects: Yes
Include test data file: Yes
```

### Generate Page Objects from URL

```
/playwright-automation generate-po

URL: https://app.example.com/login
Page name: LoginPage
Output: pages/LoginPage.ts
Include common actions: Yes
```

### Generate Page Objects from Figma 🎨

```
/playwright-automation generate-po

Figma URL: https://www.figma.com/design/xA1bC2dE3fG4hI5jK6lM7?node-id=24661-317677
Page name: DatabaseFilterPage
Output: pages/mob/database-filter.page.ts
Analyze all frames: Yes
Include data-testid strategy: Yes
```

**Output:**
- Page Object class with accurate locators
- Developer comments for AI-generated data-testid
- Figma frame references in comments
- Visual context for each UI element

### Refactor Existing Test

```
/playwright-automation refactor

Input: tests/old-login-test.spec.ts
Extract Page Objects: Yes
Apply clean code principles: Yes
Preserve test logic: Yes
```

---

## Common Pitfalls to Avoid

### Real-World Mistakes
❌ **Debugging flaky test logic first** - Always validate selectors against live page FIRST before assuming logic issue  
❌ **Not using Figma in design phase** - Missing opportunity for early test prep and testability feedback  
❌ **Validating selectors one-by-one** - Use batch validation for Page Objects used by multiple tests  
❌ **Not documenting when selectors were validated** - Add timestamp in JSDoc for maintenance tracking  
❌ **Assuming old tests are still valid** - After major UI refactor, always re-validate with live inspection  
❌ **Creating new Page Object for small UI change** - Fix existing Page Object instead of duplicating  
❌ **Not scheduling periodic validation** - Critical flows should be re-validated monthly

### Login Pattern Mistakes 🔐
❌ **Wrong login method for environment** - Using `loginStudioSkipOTP()` for App Dashboard (should use `loginApp()`)  
❌ **Missing CSV keyword analysis** - Not checking for "Draft", "Publish", or "Studio" in test case title  
❌ **Wrong URL for environment** - Using `appOfficelessDraftUrl` when CSV says "Publish Version"  
❌ **Missing project/company path** - Forgot `/${projectId}/${companyId}/login` for App Dashboard URLs  
❌ **Wrong user account** - Using `owner_form_single` for App Dashboard (should use `new_admin_app_gen2`)  
❌ **Not waiting for login completion** - Missing `waitForElement()` or verification after login  
❌ **Mixing Draft and Publish in same test** - Each test should target one environment only

### Technical Mistakes

❌ **Not asking for live page URL first** - ALWAYS offer MCP Playwright inspection before fallback to Figma/AI  
❌ **Skipping MCP Playwright availability check** - Search for tools before assuming it's available  
❌ **Skipping locator selection priority** - Always check RFC/CSV for data-testid first, then live page, then Figma context, then AI-generate  
❌ **Wrong Page Object structure** - MUST use constructor-with-locators pattern, not methods returning locators  
❌ **Not using `ai_generate_` prefix for property names** - When selector isn't from RFC/Figma/live page, property name must have `ai_generate_` prefix  
❌ **Using `ai_generate_` in data-testid** - WRONG: `data-testid="ai_generate_xxx"`. Correct: property name like `public ai_generate_btn_close: Locator`  
❌ **Using private for page property** - MUST use `public page: Page` in constructor  
❌ **Not documenting AI-generated locators** - Include JSDoc comments explaining context and recommendation  
❌ **Calling `mcp_figma_view_node` without `mcp_figma_add_figma_file` first** - Always connect to MCP Figma before viewing  
❌ **Using hyphen in node_id for API calls** - URL has `node-id=123-456`, but API needs `node_id="123:456"` (colon)  
❌ **Not choosing appropriate selector** - Use `getByRole`, `getByText`, `getByLabel` when appropriate, not always `locator()`  
❌ **Creating Page Objects for API tests** - Use Helper class pattern instead (see CRITICAL section above)  
❌ **Mixing Helper and Page Object patterns** - Follow project-specific patterns strictly

---
