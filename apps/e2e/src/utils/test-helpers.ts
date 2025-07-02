import { Page, expect, BrowserContext } from '@playwright/test';
import { MetaMask } from '@synthetixio/synpress/playwright';

/**
 * Creates a MetaMask instance with standard test configuration
 * @param context - Browser context
 * @param metamaskPage - MetaMask page
 * @param extensionId - Extension ID
 * @returns MetaMask instance
 */
export const createMetaMask = (
  context: BrowserContext,
  metamaskPage: Page,
  extensionId: string
): MetaMask => {
  return new MetaMask(context, metamaskPage, 'Tester@1234', extensionId);
};

/**
 * Connects wallet to the dApp
 * @param page - The main page
 * @param metamask - MetaMask instance
 */
export const connectWallet = async (
  page: Page,
  metamask: MetaMask
): Promise<void> => {
  await page.goto('/');
  await page
    .locator('button')
    .filter({ hasText: /connect/i })
    .first()
    .click();
  await metamask.connectToDapp();

  // Wait for connection
  await expect(
    page.locator('text=Connected').or(page.locator('text=0x')).first()
  ).toBeVisible({ timeout: 30000 });
};

/**
 * Verifies that an error message is displayed with the expected text
 * @param page - The Playwright page object
 * @param expectedError - The expected error message text
 */
export const verifyErrorDisplay = async (
  page: Page,
  expectedError: string
): Promise<void> => {
  const errorElement = page.locator('[data-testid="error-message"]');
  await expect(errorElement).toBeVisible({ timeout: 5000 });
  await expect(errorElement).toHaveText(expectedError);
};

/**
 * Verifies that no error message is displayed
 * @param page - The Playwright page object
 */
export const verifyNoError = async (page: Page): Promise<void> => {
  const errorElement = page.locator('[data-testid="error-message"]');
  await expect(errorElement).not.toBeVisible();
};
