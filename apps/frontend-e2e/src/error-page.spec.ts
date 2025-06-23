import { test, expect } from '@playwright/test';

test('should display network error page when MetaMask is not detected', async ({ page }) => {
  // Remove MetaMask by overriding window.ethereum before page load
  await page.addInitScript(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (globalThis as any).ethereum;
  });

  await page.goto('/');

  // Wait for the error boundary to display the wallet error message
  await expect(page.locator('text=/Ethereum wallet required/i')).toBeVisible({
    timeout: 10000,
  });

  // Take screenshot of the network error state
  await expect(page).toHaveScreenshot('network-error-page.png', {
    fullPage: true,
  });
});