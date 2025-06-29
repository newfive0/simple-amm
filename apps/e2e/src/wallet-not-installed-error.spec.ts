import { test, expect } from '@playwright/test';
import { argosScreenshot } from '@argos-ci/playwright';

test('should display network error page when MetaMask is not detected', async ({
  page,
}) => {
  // Remove MetaMask by overriding window.ethereum before page load
  await page.addInitScript(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (globalThis as any).ethereum;
  });

  await page.goto('/');

  // Wait for the error message to display automatically
  await expect(
    page.locator(
      'text=/Ethereum wallet required. Please install a Web3 wallet extension./i'
    )
  ).toBeVisible({
    timeout: 10000,
  });

  // Take screenshot of the network error state
  await argosScreenshot(page, 'wallet-not-installed-error');
});
