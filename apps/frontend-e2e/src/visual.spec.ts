import { testWithSynpress } from '@synthetixio/synpress';
import { MetaMask, metaMaskFixtures } from '@synthetixio/synpress/playwright';
import basicSetup from '../test/wallet-setup/basic.setup';

const test = testWithSynpress(metaMaskFixtures(basicSetup));
const { expect } = test;

test('should connect wallet and display AMM interface', async ({ context, page, metamaskPage, extensionId }) => {
  const metamask = new MetaMask(context, metamaskPage, basicSetup.walletPassword, extensionId);

  await page.goto('/');
  await page.locator('button').filter({ hasText: /connect/i }).first().click();
  await metamask.connectToDapp();

  // Wait for wallet connection to be established
  await expect(page.locator('text=Connected').or(page.locator('text=0x')).first()).toBeVisible({ timeout: 30000 });
  
  // Wait for both Swap and Liquidity components to appear
  await expect(page.locator('text=Swap').first()).toBeVisible({ timeout: 10000 });
  await expect(page.locator('text=Liquidity').first()).toBeVisible({ timeout: 10000 });
  
  // Additional wait to ensure all data has loaded
  await page.waitForTimeout(2000);

  // Take full-page screenshot showing complete AMM interface
  await expect(page).toHaveScreenshot('wallet-connected-success.png', { 
    fullPage: true 
  });
});