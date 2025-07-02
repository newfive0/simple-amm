import { testWithSynpress } from '@synthetixio/synpress';
import { MetaMask, metaMaskFixtures } from '@synthetixio/synpress/playwright';
import { Page } from '@playwright/test';
import basicSetup from '../test/wallet-setup/basic.setup';

const test = testWithSynpress(metaMaskFixtures(basicSetup));
const { expect } = test;

test.describe('Error Handling', () => {
  // Helper function to verify error display
  const verifyErrorDisplay = async (
    page: Page,
    expectedError: string
  ): Promise<void> => {
    const errorElement = page.locator('[data-testid="error-message"]');
    await expect(errorElement).toBeVisible({ timeout: 5000 });
    await expect(errorElement).toContainText(expectedError);
  };

  // Helper function to verify no error is displayed
  const verifyNoError = async (page: Page): Promise<void> => {
    const errorElement = page.locator('[data-testid="error-message"]');
    await expect(errorElement).not.toBeVisible();
  };

  test.describe('Transaction Rejection Errors', () => {
    test('should show error when user rejects swap transaction', async ({
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

      // Navigate to swap section
      const swapSection = page
        .locator('h2')
        .filter({ hasText: 'Swap' })
        .locator('../..');

      // Try to swap ETH for SIMP
      const simpTab = swapSection.getByRole('button', {
        name: 'SIMP',
        exact: true,
      });
      await simpTab.click();

      const ethInput = swapSection.getByPlaceholder('ETH → SIMP');
      await ethInput.fill('0.1');

      const swapButton = swapSection
        .locator('button')
        .filter({ hasText: 'Swap ETH for SIMP' });
      await swapButton.click();

      // Reject the transaction
      await page.waitForTimeout(3000);
      await metamask.rejectTransaction();

      // Verify error is displayed
      await verifyErrorDisplay(page, 'Swap failed:');

      // Verify the error contains rejection message
      const errorElement = page.locator('[data-testid="error-message"]');
      const errorText = await errorElement.textContent();
      expect(errorText?.toLowerCase()).toContain('user denied');
    });

    test('should show error when user rejects add liquidity', async ({
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

      // Navigate to liquidity section
      const liquiditySection = page
        .getByRole('heading', { name: 'Liquidity' })
        .locator('../..');

      // Click Add tab
      const addTab = page.getByRole('button', { name: 'Add', exact: true });
      await addTab.click();

      // Fill in liquidity amounts
      const ethInput = liquiditySection.getByPlaceholder('Enter ETH amount');
      const simpInput = liquiditySection.getByPlaceholder('Enter SIMP amount');
      await ethInput.fill('1');
      await simpInput.fill('2');

      // Click Add Liquidity
      const addButton = page.getByRole('button', { name: 'Add Liquidity' });
      await addButton.click();

      // Reject the first transaction (spending cap approval)
      await page.waitForTimeout(3000);
      await metamask.rejectTransaction();

      // Verify error is displayed
      await verifyErrorDisplay(page, 'Failed to add liquidity:');
    });

    test('should show error when user rejects remove liquidity', async ({
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

      // Setup: Connect wallet and add liquidity first
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

      // First add some liquidity (so we have LP tokens to remove)
      const liquiditySection = page
        .getByRole('heading', { name: 'Liquidity' })
        .locator('../..');

      const ethInput = liquiditySection.getByPlaceholder('Enter ETH amount');
      const simpInput = liquiditySection.getByPlaceholder('Enter SIMP amount');
      await ethInput.fill('1');
      await simpInput.fill('2');

      const addButton = page.getByRole('button', { name: 'Add Liquidity' });
      await addButton.click();

      // Confirm all transactions for adding liquidity
      await page.waitForTimeout(3000);
      await metamask.confirmTransaction();
      await page.waitForTimeout(3000);
      await metamask.confirmTransaction();
      await page.waitForTimeout(3000);
      await metamask.confirmTransaction();

      // Wait for transaction to complete
      await expect(page.getByRole('button', { name: 'Waiting...' })).toBeHidden(
        { timeout: 60000 }
      );

      // Now try to remove liquidity
      const removeTab = page.getByRole('button', {
        name: 'Remove',
        exact: true,
      });
      await removeTab.click();

      const lpInput = liquiditySection.getByPlaceholder('LP Tokens to Remove');
      await lpInput.fill('0.5');

      const removeButton = page.getByRole('button', {
        name: 'Remove Liquidity',
      });
      await removeButton.click();

      // Reject the remove liquidity transaction
      await page.waitForTimeout(3000);
      await metamask.rejectTransaction();

      // Verify error is displayed
      await verifyErrorDisplay(page, 'Failed to remove liquidity:');
    });
  });

  test.describe('Error Clearing', () => {
    test('should clear error after successful swap', async ({
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

      // First, trigger an error by rejecting a transaction
      const swapSection = page
        .locator('h2')
        .filter({ hasText: 'Swap' })
        .locator('../..');

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

      // Reject to create an error
      await page.waitForTimeout(3000);
      await metamask.rejectTransaction();
      await verifyErrorDisplay(page, 'Swap failed:');

      // Now perform a successful swap (switch back to ETH → SIMP if needed)
      const newSwapInput = swapSection.getByPlaceholder('ETH → SIMP');
      await newSwapInput.fill('0.05');

      const newSwapButton = swapSection
        .locator('button')
        .filter({ hasText: 'Swap ETH for SIMP' });
      await newSwapButton.click();

      // Confirm the transaction
      await page.waitForTimeout(3000);
      await metamask.confirmTransaction();

      // Wait for transaction to complete
      await expect(
        swapSection.locator('button').filter({ hasText: 'Waiting...' })
      ).toBeHidden({ timeout: 60000 });

      // Verify error is cleared
      await verifyNoError(page);
    });

    test('should clear error after successful add liquidity', async ({
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

      // First, trigger an error by rejecting a swap
      const swapSection = page
        .locator('h2')
        .filter({ hasText: 'Swap' })
        .locator('../..');

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

      // Reject to create an error
      await page.waitForTimeout(3000);
      await metamask.rejectTransaction();
      await verifyErrorDisplay(page, 'Swap failed:');

      // Now perform successful add liquidity
      const liquiditySection = page
        .getByRole('heading', { name: 'Liquidity' })
        .locator('../..');

      const addTab = page.getByRole('button', { name: 'Add', exact: true });
      await addTab.click();

      const ethInputLiq = liquiditySection.getByPlaceholder('Enter ETH amount');
      const simpInputLiq =
        liquiditySection.getByPlaceholder('Enter SIMP amount');
      await ethInputLiq.fill('1');
      await simpInputLiq.fill('2');

      const addButton = page.getByRole('button', { name: 'Add Liquidity' });
      await addButton.click();

      // Confirm all transactions
      await page.waitForTimeout(3000);
      await metamask.confirmTransaction();
      await page.waitForTimeout(3000);
      await metamask.confirmTransaction();
      await page.waitForTimeout(3000);
      await metamask.confirmTransaction();

      // Wait for transaction to complete
      await expect(page.getByRole('button', { name: 'Waiting...' })).toBeHidden(
        { timeout: 60000 }
      );

      // Verify error is cleared
      await verifyNoError(page);
    });
  });
});
