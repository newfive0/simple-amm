import { test, expect } from '@playwright/test';

test('should display network error page when MetaMask is not detected', async ({ page }) => {
  // Remove MetaMask by overriding window.ethereum before page load
  await page.addInitScript(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (globalThis as any).ethereum;
  });

  await page.goto('/');

  // Wait for connect wallet button to be visible
  await expect(page.locator('button').filter({ hasText: /connect wallet/i })).toBeVisible();

  // Click connect wallet button to trigger the error
  await page.locator('button').filter({ hasText: /connect wallet/i }).click();

  // Wait for the network error message to appear
  await expect(page.locator('text=/MetaMask not detected/i')).toBeVisible({
    timeout: 10000,
  });


  // Take screenshot of the network error state
  await expect(page).toHaveScreenshot('network-error-page.png', {
    fullPage: true,
  });
});