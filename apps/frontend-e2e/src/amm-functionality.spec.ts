import { testWithSynpress } from '@synthetixio/synpress';
import { MetaMask, metaMaskFixtures } from '@synthetixio/synpress/playwright';
import basicSetup from '../test/wallet-setup/basic.setup';

const test = testWithSynpress(metaMaskFixtures(basicSetup));
const { expect } = test;

test.describe('AMM Functionality', () => {
  test('should add liquidity then perform swaps', async ({ context, page, metamaskPage, extensionId }) => {
    const metamask = new MetaMask(context, metamaskPage, 'Tester@1234', extensionId);

    // Helper function to handle MetaMask transactions with 3 confirmations
    const handleTripleConfirmation = async () => {
      await page.waitForTimeout(3000);
      await metamask.confirmTransaction();
      
      await page.waitForTimeout(3000);
      await metamask.confirmTransaction();
      
      await page.waitForTimeout(3000);
      await metamask.confirmTransaction();
    };

    // Helper function to handle single MetaMask transaction
    const handleSingleConfirmation = async () => {
      await page.waitForTimeout(3000);
      await metamask.confirmTransaction();
    };

    // STEP 1: Setup and connect wallet
    const setupAndConnect = async () => {
      await page.goto('/');
      await page.locator('button').filter({ hasText: /connect/i }).first().click();
      await metamask.connectToDapp();
      
      // Wait for connection to be established
      await expect(page.locator('text=Connected').or(page.locator('text=0x')).first()).toBeVisible({ timeout: 30000 });
      
      // Wait for AMM interface to load
      await expect(page.locator('text=Swap').first()).toBeVisible({ timeout: 10000 });
      await expect(page.locator('text=Liquidity').first()).toBeVisible({ timeout: 10000 });
      
      // Wait for balance data to load
      await expect(page.locator('text=/^Balance:.*SIMP.*ETH/')).toBeVisible({ 
        timeout: 15000 
      });
    };

    // STEP 2: Add liquidity (10 ETH + 20 SIMP)
    const addLiquidity = async () => {
      const liquiditySection = page.locator('h2').filter({ hasText: 'Add Liquidity' }).locator('..');
      await expect(liquiditySection.locator('h2')).toBeVisible();
      
      // Fill in ETH amount (10 ETH)
      const ethInput = liquiditySection.locator('input[placeholder*="ETH"]');
      await ethInput.fill('10');
      
      // Fill in SIMP amount (20 SIMP)
      const simpInput = liquiditySection.locator('input[placeholder*="SIMP"]');
      await simpInput.fill('20');
      
      // Verify inputs are filled correctly
      await expect(ethInput).toHaveValue('10');
      await expect(simpInput).toHaveValue('20');
      
      // Click Add Liquidity button
      const addLiquidityButton = liquiditySection.locator('button').filter({ hasText: 'Add Liquidity' });
      await expect(addLiquidityButton).toBeEnabled();
      await addLiquidityButton.click();
      
      // Handle three-step confirmation process
      await handleTripleConfirmation();
      
      // Wait for transaction to complete
      await expect(liquiditySection.locator('button').filter({ hasText: 'Waiting...' })).toBeHidden({ timeout: 60000 });
      
      // Verify inputs are cleared after successful transaction
      await expect(ethInput).toHaveValue('');
      await expect(simpInput).toHaveValue('');
      
      // Take screenshot after liquidity addition
      await expect(page).toHaveScreenshot('add-liquidity-success.png', {
        fullPage: true,
      });
    };

    // STEP 3: Swap 1 ETH for SIMP
    const swapEthForSimp = async () => {
      const swapSection = page.locator('h2').filter({ hasText: 'Swap' }).locator('..');
      await expect(swapSection.locator('h2')).toBeVisible();
      
      // Fill in ETH amount to swap (1 ETH)
      const ethSwapInput = swapSection.locator('input[placeholder*="ETH amount"]');
      await ethSwapInput.fill('1');
      
      // Verify the input is filled
      await expect(ethSwapInput).toHaveValue('1');
      
      // Wait for SIMP output calculation to appear
      await expect(swapSection.locator('text=/≈.*SIMP/i')).toBeVisible({ timeout: 5000 });
      
      // Click Swap ETH for SIMP button
      const swapEthButton = swapSection.locator('button').filter({ hasText: 'Swap ETH for SIMP' });
      await expect(swapEthButton).toBeEnabled();
      await swapEthButton.click();
      
      // Handle single confirmation
      await handleSingleConfirmation();
      
      // Wait for transaction to complete
      await expect(swapSection.locator('button').filter({ hasText: 'Swapping...' })).toBeHidden({ timeout: 60000 });
      
      // Verify input is cleared after successful swap
      await expect(ethSwapInput).toHaveValue('');
      
      // Take screenshot after ETH to SIMP swap
      await expect(page).toHaveScreenshot('swap-eth-to-simp-success.png', {
        fullPage: true,
      });
    };

    // STEP 4: Swap 1 SIMP for ETH
    const swapSimpForEth = async () => {
      const swapSection = page.locator('h2').filter({ hasText: 'Swap' }).locator('..');
      
      // Switch swap direction to SIMP → ETH
      const swapDirectionSelect = swapSection.locator('select');
      await swapDirectionSelect.selectOption('token-to-eth');
      
      // Fill in SIMP amount to swap (1 SIMP)
      const simpSwapInput = swapSection.locator('input[placeholder*="SIMP amount"]');
      await simpSwapInput.fill('1');
      
      // Verify the input is filled
      await expect(simpSwapInput).toHaveValue('1');
      
      // Wait for ETH output calculation to appear
      await expect(swapSection.locator('text=/≈.*ETH/i')).toBeVisible({ timeout: 5000 });
      
      // Click Swap SIMP for ETH button
      const swapSimpButton = swapSection.locator('button').filter({ hasText: 'Swap SIMP for ETH' });
      await expect(swapSimpButton).toBeEnabled();
      await swapSimpButton.click();
      
      // Handle three-step confirmation process
      await handleTripleConfirmation();
      
      // Wait for transaction to complete
      await expect(page.locator('button').filter({ hasText: 'Swapping...' })).toBeHidden({ timeout: 30000 });
      
      // Verify input is cleared after successful swap
      await expect(simpSwapInput).toHaveValue('');
      
      // Take final screenshot after SIMP to ETH swap
      await expect(page).toHaveScreenshot('swap-simp-to-eth-success.png', {
        fullPage: true,
      });
    };

    // Execute all steps
    await setupAndConnect();
    await addLiquidity();
    await swapEthForSimp();
    await swapSimpForEth();
  });
});