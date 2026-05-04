import { Page, Locator, expect } from '@playwright/test';

/**
 * Page Object Model for [PAGE_NAME]
 * 
 * This class encapsulates all interactions with the [PAGE_NAME] page.
 * Following POM pattern with separation of concerns.
 */
export class [PAGE_NAME]Page {
  readonly page: Page;
  
  // Element locators (readonly, lazy evaluation with arrow functions)
  readonly [elementName] = (): Locator => this.page.locator('[data-testid="element-id"]');
  readonly [elementName2] = (): Locator => this.page.locator('[data-testid="element-id-2"]');
  
  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Navigate to the [PAGE_NAME] page
   */
  async goto() {
    await this.page.goto('/[page-path]');
    await this.waitForPageLoad();
  }

  /**
   * Wait for page to be fully loaded
   */
  async waitForPageLoad() {
    await this.page.waitForLoadState('networkidle');
    // Or wait for a specific element:
    // await this.[elementName]().waitFor();
  }

  /**
   * [Action method description]
   * @param [param] - [Description]
   */
  async [actionMethod]([parameters]) {
    // Perform actions on page elements
    await this.[elementName]().click();
    await this.[elementName2]().fill([value]);
  }

  /**
   * Assertion methods (prefix with 'expect' or 'verify')
   */
  async expectElementVisible() {
    await expect(this.[elementName]()).toBeVisible();
  }

  async expectElementHasText(expectedText: string) {
    await expect(this.[elementName]()).toHaveText(expectedText);
  }

  /**
   * Helper method to get element text
   */
  async getElementText(): Promise<string> {
    return await this.[elementName]().textContent() || '';
  }

  /**
   * Helper method to check if element exists
   */
  async isElementVisible(): Promise<boolean> {
    try {
      await this.[elementName]().waitFor({ state: 'visible', timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }
}

// Export for use in tests
export default [PAGE_NAME]Page;
