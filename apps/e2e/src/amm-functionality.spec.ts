import { testWithSynpress } from '@synthetixio/synpress';
import { metaMaskFixtures } from '@synthetixio/synpress/playwright';
import { argosScreenshot } from '@argos-ci/playwright';
import basicSetup from '../test/wallet-setup/basic.setup';
import { BalanceCalculator } from './utils/balance-calculator';
import { getGasCostsFromRecentTransactions } from './utils/gas-tracker';
import {
  createMetaMask,
  connectWallet,
  verifyErrorDisplay,
  verifyNoError,
} from './utils/test-helpers';

const test = testWithSynpress(metaMaskFixtures(basicSetup));
const { expect } = test;

test('should display AMM page with disabled elements before connection', async ({
  page,
}) => {
  // Navigate to the AMM application homepage
  await page.goto('/');

  // Verify the main heading is visible
  await expect(
    page.locator('h1').filter({ hasText: 'Very Simple AMM' })
  ).toBeVisible();

  // Verify the Connect Wallet button is present and visible
  await expect(
    page.getByRole('button', { name: 'Connect Wallet', exact: true })
  ).toBeVisible({
    timeout: 5000,
  });

  // Verify the account status shows as not connected
  await expect(page.getByText('Your Account: Not Connected')).toBeVisible({
    timeout: 10000,
  });

  // Locate the swap section and verify it's visible
  const swapSection = page
    .locator('h2')
    .filter({ hasText: 'Swap' })
    .locator('../..');
  await expect(swapSection).toBeVisible();

  // Verify swap button shows "Please connect wallet" message
  await expect(
    swapSection.getByRole('button', { name: 'Please connect wallet' })
  ).toBeVisible();

  // Verify token selection buttons (ETH/SIMP) are disabled without wallet connection
  await expect(swapSection.getByRole('button', { name: 'ETH' })).toBeDisabled();
  await expect(
    swapSection.getByRole('button', { name: 'SIMP' })
  ).toBeDisabled();

  // Verify liquidity section buttons (Add/Remove) are disabled without wallet connection
  await expect(page.getByRole('button', { name: 'Add' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Remove' })).toBeDisabled();

  // Verify the second "Please connect wallet" button in liquidity section
  await expect(
    page.getByRole('button', { name: 'Please connect wallet' }).nth(1)
  ).toBeVisible();

  // Take a screenshot for visual regression testing
  await argosScreenshot(page, 'amm-before-connection');
});

test.describe('AMM Functionality', () => {
  test('should add liquidity then perform swaps', async ({
    context,
    page,
    metamaskPage,
    extensionId,
  }) => {
    const metamask = createMetaMask(context, metamaskPage, extensionId);
    const balanceCalculator = new BalanceCalculator();

    // Helper function to handle MetaMask transactions with 3 confirmations and return gas cost
    const handleTripleConfirmation = async (): Promise<number> => {
      await metamask.confirmTransaction();
      await page.waitForTimeout(3000);

      await metamask.confirmTransaction();
      await page.waitForTimeout(3000);

      await metamask.confirmTransaction();
      await page.waitForTimeout(3000);

      // Get gas costs from the 2 actual blockchain transactions (approve + addLiquidity)
      // Note: First confirmation is just MetaMask's spending cap UI, not a transaction
      return await getGasCostsFromRecentTransactions(2);
    };

    const handleSingleConfirmation = async (): Promise<number> => {
      await metamask.confirmTransaction();
      await page.waitForTimeout(3000);

      return await getGasCostsFromRecentTransactions(1);
    };

    const setupAndConnect = async () => {
      // Connect MetaMask wallet to the dApp
      await connectWallet(page, metamask);

      // Wait for the main AMM sections to become visible after wallet connection
      await expect(page.locator('text=Swap').first()).toBeVisible({
        timeout: 10000,
      });
      await expect(page.locator('text=Liquidity').first()).toBeVisible({
        timeout: 10000,
      });

      // Wait for the balance display to appear with both SIMP and ETH balances
      await expect(page.locator('text=/^Balance:.*SIMP.*ETH/')).toBeVisible({
        timeout: 15000,
      });

      // Verify the displayed balances match our expected initial balances
      const currentBalances = balanceCalculator.getCurrentBalances();
      const expectedBalanceText = `Balance: ${currentBalances.simpBalance.toFixed(4)} SIMP | ${currentBalances.ethBalance.toFixed(4)} ETH`;
      const balanceElement = page.getByText('Balance:').locator('..');
      await expect(balanceElement).toHaveText(expectedBalanceText, {
        timeout: 10000,
      });

      // Take a screenshot of the connected state with initial balances
      await argosScreenshot(page, 'wallet-connected-initial-balances');
    };

    const addLiquidity = async () => {
      // Navigate to the liquidity section and verify it's visible
      await expect(
        page.getByRole('heading', { name: 'Liquidity' })
      ).toBeVisible();

      // Click on the "Add" tab to access liquidity addition functionality
      const addTab = page.getByRole('button', { name: 'Add', exact: true });
      await expect(addTab).toBeVisible();
      await addTab.click();

      // Locate the liquidity section container
      const liquiditySection = page
        .getByRole('heading', { name: 'Liquidity' })
        .locator('../..');

      // Wait for the input fields to become visible
      await expect(
        liquiditySection.getByPlaceholder('Enter ETH amount')
      ).toBeVisible({ timeout: 10000 });

      // Fill in both amounts for initial liquidity (pool is empty, so no auto-calculation)
      // This establishes the initial pool ratio of 1 ETH : 20 SIMP
      const ethInput = liquiditySection.getByPlaceholder('Enter ETH amount');
      await ethInput.fill('100');

      const simpInput = liquiditySection.getByPlaceholder('Enter SIMP amount');
      await simpInput.fill('2000');

      // Trigger formatting by losing focus
      await ethInput.blur();
      await simpInput.blur();

      // Verify both input values are correctly set with proper formatting
      await expect(ethInput).toHaveValue('100.0000');
      await expect(simpInput).toHaveValue('2000.0000');

      // Click the "Add Liquidity" button to initiate the transaction
      const addLiquidityButton = page.getByRole('button', {
        name: 'Add Liquidity',
      });
      await expect(addLiquidityButton).toBeEnabled();
      await addLiquidityButton.click();

      // Wait for the confirmation dialog and click proceed
      const proceedButton = page.getByRole('button', { name: 'Proceed' });
      await expect(proceedButton).toBeVisible({ timeout: 5000 });
      await proceedButton.click();

      // Handle the 3-step MetaMask confirmation process:
      // 1. Spending cap approval UI
      // 2. Token approval transaction
      // 3. Add liquidity transaction
      const gasUsed = await handleTripleConfirmation();

      // Wait for the transaction to complete (waiting indicator disappears)
      await expect(page.getByRole('button', { name: 'Waiting...' })).toBeHidden(
        { timeout: 60000 }
      );

      // Verify the input fields are cleared after successful transaction
      await expect(ethInput).toHaveValue('');
      await expect(simpInput).toHaveValue('');

      // Update our balance tracker and verify the UI reflects the new balances
      balanceCalculator.updateBalancesAfterAddLiquidity(100, 2000, gasUsed);
      const updatedBalances = balanceCalculator.getCurrentBalances();
      const expectedBalanceText = `Balance: ${updatedBalances.simpBalance.toFixed(4)} SIMP | ${updatedBalances.ethBalance.toFixed(4)} ETH`;
      const balanceElement = page.getByText('Balance:').locator('..');
      await expect(balanceElement).toHaveText(expectedBalanceText, {
        timeout: 10000,
      });

      // Take a screenshot of the successful liquidity addition
      await argosScreenshot(page, 'add-liquidity-success');
    };
    const swapEthForSimp = async () => {
      // Locate the swap section and verify it's visible
      const swapSection = page
        .locator('h2')
        .filter({ hasText: 'Swap' })
        .locator('../..');
      await expect(swapSection.locator('h2')).toBeVisible();

      // Click the SIMP tab to set up ETH → SIMP swap direction
      const simpTab = swapSection.getByRole('button', {
        name: 'SIMP',
        exact: true,
      });
      await expect(simpTab).toBeEnabled();
      await simpTab.click();

      // Fill in the ETH amount to swap (1 ETH)
      const ethSwapInput = swapSection.getByPlaceholder('ETH → SIMP');
      await expect(ethSwapInput).toBeVisible({ timeout: 5000 });
      await ethSwapInput.fill('1');

      // Verify the input value is correctly set
      await expect(ethSwapInput).toHaveValue('1');

      // Wait for the estimated SIMP output to be displayed
      // The "≈" symbol indicates this is an estimate based on current pool ratios
      await expect(swapSection.locator('text=/≈.*SIMP/i')).toBeVisible({
        timeout: 5000,
      });

      // Click the swap button to initiate the ETH → SIMP transaction
      const swapEthButton = swapSection
        .locator('button')
        .filter({ hasText: 'Swap ETH for SIMP' });
      await expect(swapEthButton).toBeEnabled();
      await swapEthButton.click();

      // Handle single MetaMask confirmation (ETH swaps don't require token approval)
      const ethSwapGasUsed = await handleSingleConfirmation();

      // Wait for the swap transaction to complete
      await expect(
        swapSection.locator('button').filter({ hasText: 'Waiting...' })
      ).toBeHidden({ timeout: 60000 });

      // Verify the input field is cleared after successful swap
      await expect(ethSwapInput).toHaveValue('');

      // Update our balance tracker with the swap results and gas costs
      balanceCalculator.updateBalancesAfterSwapEthForSimp(1, ethSwapGasUsed);

      // Verify the UI displays the updated balances
      const swapUpdatedBalances = balanceCalculator.getCurrentBalances();
      const expectedBalanceText = `Balance: ${swapUpdatedBalances.simpBalance.toFixed(4)} SIMP | ${swapUpdatedBalances.ethBalance.toFixed(4)} ETH`;
      const balanceElement = page.getByText('Balance:').locator('..');
      await expect(balanceElement).toHaveText(expectedBalanceText, {
        timeout: 10000,
      });

      // Take a screenshot of the successful ETH → SIMP swap
      await argosScreenshot(page, 'swap-eth-to-simp-success');
    };
    const swapSimpForEth = async () => {
      // Locate the swap section for the reverse swap (SIMP → ETH)
      const swapSection = page
        .locator('h2')
        .filter({ hasText: 'Swap' })
        .locator('../..');

      // Click the ETH tab to set up SIMP → ETH swap direction
      const ethTab = swapSection.getByRole('button', {
        name: 'ETH',
        exact: true,
      });
      await expect(ethTab).toBeEnabled();
      await ethTab.click();

      // Fill in the SIMP amount to swap (1 SIMP token)
      const simpSwapInput = swapSection.getByPlaceholder('SIMP → ETH');
      await expect(simpSwapInput).toBeVisible({ timeout: 5000 });
      await simpSwapInput.fill('1');

      // Verify the input value is correctly set
      await expect(simpSwapInput).toHaveValue('1');

      // Wait for the estimated ETH output to be displayed
      // The pool ratios have changed from previous swaps, affecting the exchange rate
      await expect(swapSection.locator('text=/≈.*ETH/i')).toBeVisible({
        timeout: 5000,
      });

      // Click the swap button to initiate the SIMP → ETH transaction
      const swapSimpButton = swapSection
        .locator('button')
        .filter({ hasText: 'Swap SIMP for ETH' });
      await expect(swapSimpButton).toBeEnabled();
      await swapSimpButton.click();

      // Handle 3-step MetaMask confirmation for SIMP → ETH swap:
      // 1. Spending cap approval UI
      // 2. Token approval transaction (to allow AMM to spend SIMP)
      // 3. Actual swap transaction
      const simpToEthGasUsed = await handleTripleConfirmation();

      // Wait for the swap transaction to complete
      await expect(
        swapSection.locator('button').filter({ hasText: 'Waiting...' })
      ).toBeHidden({ timeout: 60000 });

      // Verify the input field is cleared after successful swap
      await expect(simpSwapInput).toHaveValue('', { timeout: 10000 });

      // Update our balance tracker with the swap results and gas costs
      balanceCalculator.updateBalancesAfterSwapSimpForEth(1, simpToEthGasUsed);

      // Verify the UI displays the final balances after all transactions
      const finalBalances = balanceCalculator.getCurrentBalances();
      const expectedBalanceText = `Balance: ${finalBalances.simpBalance.toFixed(4)} SIMP | ${finalBalances.ethBalance.toFixed(4)} ETH`;
      const balanceElement = page.getByText('Balance:').locator('..');
      await expect(balanceElement).toHaveText(expectedBalanceText, {
        timeout: 10000,
      });

      // Take a screenshot of the successful SIMP → ETH swap
      await argosScreenshot(page, 'swap-simp-to-eth-success');
    };

    const testTransactionRejection = async () => {
      // Test swap rejection
      const swapSection = page
        .locator('h2')
        .filter({ hasText: 'Swap' })
        .locator('../..');

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
      await metamask.rejectTransaction();
      await page.waitForTimeout(3000);

      // Verify error is displayed
      await verifyErrorDisplay(page, 'Swap failed: user rejected action');
    };

    const testErrorClearing = async () => {
      // The error from previous test should still be displayed
      // Now perform a successful swap to clear it
      const swapSection = page
        .locator('h2')
        .filter({ hasText: 'Swap' })
        .locator('../..');

      const newSwapInput = swapSection.getByPlaceholder('ETH → SIMP');
      await newSwapInput.fill('0.05');

      const newSwapButton = swapSection
        .locator('button')
        .filter({ hasText: 'Swap ETH for SIMP' });
      await newSwapButton.click();

      // Confirm the transaction and get gas costs
      const ethSwapGasUsed = await handleSingleConfirmation();

      // Update balance calculator with the 0.05 ETH swap
      balanceCalculator.updateBalancesAfterSwapEthForSimp(0.05, ethSwapGasUsed);

      // Verify error is cleared
      await verifyNoError(page);
    };

    const testSlippageProtection = async () => {
      const { ContractManipulator } = await import(
        './utils/contract-manipulator'
      );

      const manipulator = new ContractManipulator();

      // Step 1: Set up liquidity addition via normal UI operation
      await expect(
        page.getByRole('heading', { name: 'Liquidity' })
      ).toBeVisible();

      const addTab = page.getByRole('button', { name: 'Add', exact: true });
      await expect(addTab).toBeVisible();
      await addTab.click();

      const liquiditySection = page
        .getByRole('heading', { name: 'Liquidity' })
        .locator('../..');

      await expect(
        liquiditySection.getByPlaceholder('Enter ETH amount')
      ).toBeVisible({ timeout: 10000 });

      const ethInput = liquiditySection.getByPlaceholder('Enter ETH amount');
      await ethInput.clear();
      await ethInput.fill('10');

      // Calculate expected SIMP amount based on current pool ratio
      const expectedSimpAmount =
        balanceCalculator.calculateRequiredTokenAmount(10);

      const simpInput = liquiditySection.getByPlaceholder('Enter SIMP amount');

      // Verify the SIMP amount was auto-calculated correctly
      const actualValue = await simpInput.inputValue();
      const actualAmount = parseFloat(actualValue);

      // The balance calculator may be slightly out of sync with contract reserves
      // due to gas costs and precision differences, so we use a reasonable tolerance
      expect(actualAmount).toBeCloseTo(expectedSimpAmount, 4);

      const addLiquidityButton = page.getByRole('button', {
        name: 'Add Liquidity',
      });
      await expect(addLiquidityButton).toBeEnabled();

      await addLiquidityButton.click();

      // Step 2: Wait for confirmation dialog to appear (but don't confirm yet)
      const proceedButton = page.getByRole('button', { name: 'Proceed' });
      await expect(proceedButton).toBeVisible({ timeout: 5000 });

      // Step 3: Create slippage conditions using ContractManipulator
      // This simulates another user making a large trade that changes pool ratios
      // Large swap to significantly change pool ratios and create slippage
      await manipulator.swapEthForTokens(BigInt(50e18));

      // Step 4: Now confirm the UI transaction (should fail due to slippage)
      await proceedButton.click();

      // Two-step confirmation process:
      // 1. Spending cap approval for token allowance
      await metamask.confirmTransaction();
      await page.waitForTimeout(3000);

      // 2. Actual add liquidity transaction (this should fail due to slippage)
      await metamask.confirmTransaction();

      // Step 5: Verify slippage error is displayed in the UI
      // Wait for transaction to complete (waiting indicator disappears)
      await expect(page.getByRole('button', { name: 'Waiting...' })).toBeHidden(
        { timeout: 60000 }
      );

      // Verify the specific slippage protection error is displayed
      // The error should show our user-friendly custom error message
      await verifyErrorDisplay(
        page,
        'Add liquidity failed: Slippage protection triggered (0.5% tolerance). Try again or reduce trade size.'
      );

      await argosScreenshot(page, 'slippage-protection-test');
    };

    // Initialize the balance calculator to track token and ETH balances
    await balanceCalculator.initialize();

    // Execute the complete AMM functionality test sequence:
    await setupAndConnect();
    await addLiquidity();
    await swapEthForSimp();
    await swapSimpForEth();

    // Test error handling scenarios
    await testTransactionRejection();
    await testErrorClearing();

    await testSlippageProtection();
  });
});
