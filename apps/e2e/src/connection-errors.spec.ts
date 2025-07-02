import { testWithSynpress } from '@synthetixio/synpress';
import { MetaMask, metaMaskFixtures } from '@synthetixio/synpress/playwright';
import basicSetup from '../test/wallet-setup/basic.setup';

const test = testWithSynpress(metaMaskFixtures(basicSetup));
const { expect } = test;

test.describe('Connection and Network Errors', () => {
  test('should show error when wallet connection is lost during transaction', async ({
    context,
    page,
    metamaskPage,
    extensionId,
  }) => {
    const metamask = new MetaMask(
      context,
      metamaskPage,
      'Tester@1234',
      extensionId
    );

    // Setup: Connect wallet first
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

    // Start a swap
    const swapSection = page
      .locator('h2')
      .filter({ hasText: 'Swap' })
      .locator('../..');

    // Click SIMP tab to switch to ETH → SIMP
    const simpTab = swapSection.getByRole('button', {
      name: 'SIMP',
      exact: true,
    });
    await simpTab.click();

    const swapInput = swapSection.getByPlaceholder('ETH → SIMP');
    await swapInput.fill('0.1');

    const swapButton = swapSection
      .locator('button')
      .filter({ hasText: 'Swap ETH for SIMP' });
    await swapButton.click();

    // Wait for the transaction prompt to appear
    await page.waitForTimeout(2000);

    // Simulate connection loss by closing MetaMask notification windows
    const metamaskPages = context
      .pages()
      .filter(
        (p) =>
          p.url().includes('chrome-extension') &&
          p.url().includes('notification')
      );
    for (const notificationPage of metamaskPages) {
      await notificationPage.close();
    }

    // Wait and verify error is shown
    await page.waitForTimeout(5000);

    // The error should be some form of connection failure
    const errorElement = page.locator('[data-testid="error-message"]');
    await expect(errorElement).toBeVisible({ timeout: 10000 });

    // Verify it contains an error message
    const errorText = await errorElement.textContent();
    expect(errorText).toContain('Swap failed:');
  });
});
