import { testWithSynpress } from '@synthetixio/synpress';
import { metaMaskFixtures } from '@synthetixio/synpress/playwright';
import { argosScreenshot } from '@argos-ci/playwright';
import basicSetup from '../test/wallet-setup/basic.setup';
import {
  createMetaMask,
  connectWallet,
  verifyErrorDisplay,
} from './utils/test-helpers';
import { ContractManipulator } from './utils/contract-manipulator';
import { initializeCalculator } from './utils/balance-calculator';

const test = testWithSynpress(metaMaskFixtures(basicSetup));
const { expect } = test;

test.describe('Liquidity Slippage Scenarios', () => {
  test('should display slippage error when pool state changes after user confirms expected output', async ({
    context,
    page,
    metamaskPage,
    extensionId,
  }) => {
    const metamask = createMetaMask(context, metamaskPage, extensionId);
    const contractManipulator = new ContractManipulator();

    await initializeCalculator();
    await connectWallet(page, metamask);

    await expect(page.locator('text=Liquidity').first()).toBeVisible({
      timeout: 10000,
    });

    const addTab = page.getByRole('button', { name: 'Add', exact: true });
    await addTab.click();

    const liquiditySection = page
      .getByRole('heading', { name: 'Liquidity' })
      .locator('../..');

    await expect(
      liquiditySection.getByPlaceholder('Enter ETH amount')
    ).toBeVisible({ timeout: 10000 });

    const ethInput = liquiditySection.getByPlaceholder('Enter ETH amount');
    const simpInput = liquiditySection.getByPlaceholder('Enter SIMP amount');

    await ethInput.fill('10');
    await simpInput.fill('20');

    await expect(ethInput).toHaveValue('10.0');
    await expect(simpInput).toHaveValue('20.0');

    // Step 1: Set up dialog handler to manipulate BEFORE accepting
    page.on('dialog', async (dialog) => {
      // Step 2: Dialog appeared - expected output has been calculated and shown
      // Now manipulate pool state with unequal ratios to create actual slippage
      await contractManipulator.addLiquidity('100', '50');
      await page.waitForTimeout(2000);

      // Step 3: User accepts dialog with outdated expected output
      await dialog.accept();
    });

    // Step 4: User clicks Add Liquidity button - triggers expected output calculation and dialog
    const addLiquidityButton = page.getByRole('button', {
      name: 'Add Liquidity',
    });
    await expect(addLiquidityButton).toBeEnabled();
    await addLiquidityButton.click();

    // Wait for dialog to be handled and processing to continue
    await page.waitForTimeout(5000);

    // Step 5: Confirm MetaMask spending cap UI
    await metamask.confirmTransaction();
    await page.waitForTimeout(2000);

    // Step 6: Confirm token approval transaction
    await metamask.confirmTransaction();
    await page.waitForTimeout(2000);

    // Step 7: The addLiquidity transaction will fail due to slippage protection
    // It will revert before reaching MetaMask, so we check for error on page
    await verifyErrorDisplay(
      page,
      'Add liquidity failed: execution reverted (unknown custom error)'
    );

    await argosScreenshot(page, 'liquidity-slippage-error');
  });
});
