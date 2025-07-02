import { Page, expect } from '@playwright/test';

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
