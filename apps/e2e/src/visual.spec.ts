import { testWithSynpress } from '@synthetixio/synpress';
import { MetaMask, metaMaskFixtures } from '@synthetixio/synpress/playwright';
import basicSetup from '../test/wallet-setup/basic.setup';

const test = testWithSynpress(metaMaskFixtures(basicSetup));
const { expect } = test;

test('should display connect wallet page before connection', async ({ page }) => {
  await page.goto('/');

  // Wait for the connect wallet UI to be visible
  await expect(page.locator('button').filter({ hasText: /connect wallet/i })).toBeVisible({
    timeout: 5000,
  });

  // Wait for the main heading to be visible
  await expect(page.locator('h1').filter({ hasText: 'Simple AMM' })).toBeVisible();

  // Take screenshot of the initial connect wallet state
  await expect(page).toHaveScreenshot('connect-wallet-page.png', {
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