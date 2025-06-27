import { testWithSynpress } from '@synthetixio/synpress';
import { MetaMask, metaMaskFixtures } from '@synthetixio/synpress/playwright';
import basicSetup from '../test/wallet-setup/basic.setup';

const test = testWithSynpress(metaMaskFixtures(basicSetup));
const { expect } = test;

test('should display AMM page with disabled elements before connection', async ({ page }) => {
  await page.goto('/');

  // Wait for the main heading to be visible
  await expect(page.locator('h1').filter({ hasText: 'Very Simple AMM' })).toBeVisible();

  // Wait for the connect wallet button in header to be visible
  await expect(page.getByRole('button', { name: 'Connect Wallet', exact: true })).toBeVisible({
    timeout: 5000,
  });

  // Wait for disabled swap elements to be visible
  await expect(page.getByText('Swap Tokens')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Please connect wallet' })).toBeVisible();
  await expect(page.getByText('Your Account: Not connected')).toBeVisible();

  // Take screenshot of the initial AMM state before connection
  await expect(page).toHaveScreenshot('amm-before-connection.png', {
    fullPage: true,
  });
});


test('should connect wallet and display AMM interface', async ({ context, page, metamaskPage, extensionId }) => {
  const metamask = new MetaMask(context, metamaskPage, 'Tester@1234', extensionId);

  await page.goto('/');
  await page.locator('button').filter({ hasText: /connect/i }).first().click();
  await metamask.connectToDapp();

  // Wait for wallet connection to be established
  await expect(page.locator('text=Connected').or(page.locator('text=0x')).first()).toBeVisible({ timeout: 30000 });
  
  // Wait for both Swap and Liquidity components to appear
  await expect(page.locator('text=Swap').first()).toBeVisible({ timeout: 10000 });
  await expect(page.locator('text=Liquidity').first()).toBeVisible({ timeout: 10000 });
  
  // Wait for token symbol to load from contract in the balance display
  await expect(page.locator('text=/^Balance:.*SIMP.*ETH/')).toBeVisible({ 
    timeout: 15000 
  });
});