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
  await expect(page.getByText('Connected Account: Not Connected')).toBeVisible({
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

  // Verify switch direction button is disabled without wallet connection
  await expect(
    swapSection.getByRole('button', { name: 'Switch Direction' })
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
      await page.waitForTimeout(1000);
      await metamask.confirmTransaction();
      await page.waitForTimeout(1000);

      await metamask.confirmTransaction();
      await page.waitForTimeout(1000);

      await metamask.confirmTransaction();
      await page.waitForTimeout(1000);

      // Get gas costs from the 2 actual blockchain transactions (approve + addLiquidity)
      // Note: First confirmation is just MetaMask's spending cap UI, not a transaction
      return await getGasCostsFromRecentTransactions(2);
    };

    const handleSingleConfirmation = async (): Promise<number> => {
      await metamask.confirmTransaction();
      await page.waitForTimeout(1000);

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

      // Wait for the connected account to appear
      await expect(page.getByText('Connected Account:')).toBeVisible({
        timeout: 15000,
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

      // Take a snapshot of the add liquidity confirmation dialog
      await argosScreenshot(page, 'add-liquidity-confirm-dialog');

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

      // Update our balance tracker
      balanceCalculator.addLiquidity(100, 2000, gasUsed);

      // Take a screenshot of the successful liquidity addition
      await argosScreenshot(page, 'add-liquidity-success');
    };

    const removeLiquidity = async () => {
      // Navigate to the liquidity section and verify it's visible
      await expect(
        page.getByRole('heading', { name: 'Liquidity' })
      ).toBeVisible();

      // Click on the "Remove" tab to access liquidity removal functionality
      const removeTab = page.getByRole('button', {
        name: 'Remove',
        exact: true,
      });
      await expect(removeTab).toBeVisible();
      await removeTab.click();

      // Locate the liquidity section container
      const liquiditySection = page
        .getByRole('heading', { name: 'Liquidity' })
        .locator('../..');

      // Wait for the input field to become visible
      await expect(
        liquiditySection.getByPlaceholder('LP Tokens to Remove')
      ).toBeVisible({ timeout: 10000 });

      // Fill in the LP tokens to remove (smaller amount for testing)
      const lpInput = liquiditySection.getByPlaceholder('LP Tokens to Remove');
      await lpInput.fill('50');

      // Wait for the expected output to be displayed (format: "X.XXXX SIMP + X.XXXX ETH")
      await expect(
        liquiditySection.locator('div[class*="expectedOutput"]')
      ).toBeVisible({
        timeout: 5000,
      });

      // Get reference to the remove liquidity button for testing
      const removeLiquidityButton = page.getByRole('button', {
        name: 'Remove Liquidity',
      });

      // Test exceeding balance scenario: Try to remove more LP tokens than available
      // The user should have approximately sqrt(100 * 2000) = ~447 LP tokens from initial liquidity
      await lpInput.fill('500'); // Exceeds available LP tokens

      // Verify the remove liquidity button is disabled when exceeding balance
      await expect(removeLiquidityButton).toBeDisabled();

      // Reset to valid amount to continue with the test
      await lpInput.fill('50');
      await expect(
        liquiditySection.locator('div[class*="expectedOutput"]')
      ).toBeVisible({
        timeout: 5000,
      });

      // Click the "Remove Liquidity" button to initiate the transaction
      await expect(removeLiquidityButton).toBeEnabled();
      await removeLiquidityButton.click();

      // Wait for the confirmation dialog and verify its content
      const confirmDialog = page.locator('[class*="dialog"]');
      await expect(confirmDialog).toBeVisible({ timeout: 5000 });

      // Verify the dialog title and content
      await expect(
        confirmDialog.getByText('Confirm Remove Liquidity')
      ).toBeVisible();
      await expect(
        confirmDialog.getByText(
          /Are you sure you want to remove.*50.*LP tokens/
        )
      ).toBeVisible();
      await expect(confirmDialog.getByText('You will receive:')).toBeVisible();

      // Verify the dialog shows expected token amounts
      await expect(confirmDialog.locator('text=/\\d+.*SIMP/i')).toBeVisible();
      await expect(confirmDialog.locator('text=/\\d+.*ETH/i')).toBeVisible();

      // Take a snapshot of the remove liquidity confirmation dialog
      await argosScreenshot(page, 'remove-liquidity-confirm-dialog');

      // Click the "Remove" button to confirm
      const removeButton = confirmDialog.getByRole('button', {
        name: 'Remove',
      });
      await expect(removeButton).toBeVisible();
      await removeButton.click();

      // Handle single MetaMask confirmation for remove liquidity
      const removeLiquidityGasUsed = await handleSingleConfirmation();

      // Wait for the transaction to complete (waiting indicator disappears)
      await expect(page.getByRole('button', { name: 'Waiting...' })).toBeHidden(
        { timeout: 60000 }
      );

      // Verify the input field is cleared after successful transaction
      await expect(lpInput).toHaveValue('');

      // Update our balance tracker with the removal results and gas costs
      balanceCalculator.removeLiquidity(50, removeLiquidityGasUsed);

      // Take a screenshot of the successful liquidity removal
      await argosScreenshot(page, 'remove-liquidity-success');
    };

    const buySimpWithEth = async () => {
      // Locate the swap section and verify it's visible
      const swapSection = page
        .locator('h2')
        .filter({ hasText: 'Swap' })
        .locator('../..');
      await expect(swapSection.locator('h2')).toBeVisible();

      // For ETH → SIMP swap, we input the desired SIMP amount (reverse calculation)
      // Default direction is already eth-to-token (Get SIMP), so no switch needed

      // Fill in the desired SIMP amount to get (using reverse calculation)
      const swapInput = swapSection.getByPlaceholder('Get SIMP');
      await expect(swapInput).toBeVisible({ timeout: 5000 });
      await swapInput.fill('20');

      // Verify the input value is correctly set
      await expect(swapInput).toHaveValue('20');

      // Wait for the estimated ETH input to be displayed (reverse calculation)
      // The "≈" symbol indicates this is an estimate based on current pool ratios
      await expect(swapSection.locator('text=/≈.*ETH/i')).toBeVisible({
        timeout: 5000,
      });

      // Get reference to the swap button for testing
      const swapButton = swapSection
        .locator('button')
        .filter({ hasText: 'Buy SIMP with ETH' });

      // Test exceeding reserve scenario: Try to get more SIMP than available
      await swapInput.fill('2500'); // Exceeds the ~2000 SIMP reserve after initial liquidity

      // Verify the "Exceeds available liquidity" message appears
      await expect(
        swapSection
          .locator('div[class*="expectedOutput"]')
          .getByText('Exceeds available liquidity')
      ).toBeVisible({ timeout: 5000 });

      // Verify the swap button is disabled when exceeding reserves
      await expect(swapButton).toBeDisabled();

      // Reset to valid amount to continue with the test
      await swapInput.fill('20');
      await expect(swapSection.locator('text=/≈.*ETH/i')).toBeVisible({
        timeout: 5000,
      });

      // Click the swap button to initiate the ETH → SIMP transaction
      await expect(swapButton).toBeEnabled();
      await swapButton.click();

      // Wait for the confirmation dialog and click proceed
      const proceedButton = page.getByRole('button', { name: 'Proceed' });
      await expect(proceedButton).toBeVisible({ timeout: 5000 });

      // Verify the confirmation dialog shows user-friendly text
      await expect(page.getByText(/You'll pay:/)).toBeVisible();
      await expect(page.getByText(/You'll receive:/)).toBeVisible();

      // Take a snapshot of the ETH to SIMP swap confirmation dialog
      await argosScreenshot(page, 'eth-to-simp-swap-confirm-dialog');

      await proceedButton.click();

      // Handle single MetaMask confirmation (ETH swaps don't require token approval)
      const ethSwapGasUsed = await handleSingleConfirmation();

      // Wait for the swap transaction to complete
      await expect(
        swapSection.locator('button').filter({ hasText: 'Waiting...' })
      ).toBeHidden({ timeout: 60000 });

      // Verify the input field is cleared after successful swap
      await expect(swapInput).toHaveValue('');

      // Update our balance tracker with the swap results and gas costs
      // Using reverse calculation: we want 20 SIMP output
      balanceCalculator.buySimpWithEth(20, ethSwapGasUsed);

      // Take a screenshot of the successful ETH → SIMP swap
      await argosScreenshot(page, 'swap-eth-to-simp-success');
    };
    const buyEthWithSimp = async () => {
      // Locate the swap section for the reverse swap (SIMP → ETH)
      const swapSection = page
        .locator('h2')
        .filter({ hasText: 'Swap' })
        .locator('../..');

      // For SIMP → ETH swap, we need to switch direction to 'Get ETH'
      const switchButton = swapSection.getByRole('button', {
        name: 'Switch Direction',
        exact: true,
      });
      await expect(switchButton).toBeEnabled();
      await switchButton.click();

      // Fill in the desired ETH amount to get (using reverse calculation)
      const swapInput = swapSection.getByPlaceholder('Get ETH');
      await expect(swapInput).toBeVisible({ timeout: 5000 });
      await swapInput.fill('0.5');

      // Verify the input value is correctly set
      await expect(swapInput).toHaveValue('0.5');

      // Wait for the estimated SIMP input to be displayed (reverse calculation)
      // The pool ratios have changed from previous swaps, affecting the exchange rate
      await expect(swapSection.locator('text=/≈.*SIMP/i')).toBeVisible({
        timeout: 5000,
      });

      // Get reference to the swap button for testing
      const swapButton = swapSection
        .locator('button')
        .filter({ hasText: 'Buy ETH with SIMP' });

      // Test exceeding reserve scenario: Try to get more ETH than available
      await swapInput.fill('150'); // Exceeds the ~100 ETH reserve after initial liquidity

      // Verify the "Exceeds available liquidity" message appears
      await expect(
        swapSection
          .locator('div[class*="expectedOutput"]')
          .getByText('Exceeds available liquidity')
      ).toBeVisible({ timeout: 5000 });

      // Verify the swap button is disabled when exceeding reserves
      await expect(swapButton).toBeDisabled();

      // Reset to valid amount to continue with the test
      await swapInput.fill('0.5');
      await expect(swapSection.locator('text=/≈.*SIMP/i')).toBeVisible({
        timeout: 5000,
      });

      // Click the swap button to initiate the SIMP → ETH transaction
      await expect(swapButton).toBeEnabled();
      await swapButton.click();

      // Wait for the confirmation dialog and click proceed
      const proceedButton = page.getByRole('button', { name: 'Proceed' });
      await expect(proceedButton).toBeVisible({ timeout: 5000 });

      // Verify the confirmation dialog shows user-friendly text
      await expect(page.getByText(/You'll pay:/)).toBeVisible();
      await expect(page.getByText(/You'll receive:/)).toBeVisible();

      // Take a snapshot of the SIMP to ETH swap confirmation dialog
      await argosScreenshot(page, 'simp-to-eth-swap-confirm-dialog');

      await proceedButton.click();

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
      await expect(swapInput).toHaveValue('', { timeout: 10000 });

      // Update our balance tracker with the swap results and gas costs
      // Using reverse calculation: we want 0.5 ETH output
      balanceCalculator.buyEthWithSimp(0.5, simpToEthGasUsed);

      // Take a screenshot of the successful SIMP → ETH swap
      await argosScreenshot(page, 'swap-simp-to-eth-success');
    };

    const testTransactionRejection = async () => {
      // Test swap rejection
      const swapSection = page
        .locator('h2')
        .filter({ hasText: 'Swap' })
        .locator('../..');

      const switchButton = swapSection.getByRole('button', {
        name: 'Switch Direction',
        exact: true,
      });
      await switchButton.click();

      const ethInput = swapSection.getByPlaceholder('Get SIMP');
      await ethInput.fill('0.1');

      const swapButton = swapSection
        .locator('button')
        .filter({ hasText: 'Buy SIMP with ETH' });
      await swapButton.click();

      // Wait for the confirmation dialog and click proceed
      const proceedButton = page.getByRole('button', { name: 'Proceed' });
      await expect(proceedButton).toBeVisible({ timeout: 5000 });
      await proceedButton.click();

      // Reject the transaction
      await metamask.rejectTransaction();
      await page.waitForTimeout(1000);

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

      const newSwapInput = swapSection.getByPlaceholder('Get SIMP');
      await newSwapInput.fill('1');

      const newSwapButton = swapSection
        .locator('button')
        .filter({ hasText: 'Buy SIMP with ETH' });
      await newSwapButton.click();

      // Wait for the confirmation dialog and click proceed
      const proceedButton = page.getByRole('button', { name: 'Proceed' });
      await expect(proceedButton).toBeVisible({ timeout: 5000 });
      await proceedButton.click();

      // Confirm the transaction and get gas costs
      const ethSwapGasUsed = await handleSingleConfirmation();

      // Update balance calculator with the swap using reverse logic
      // We want 1 SIMP output
      balanceCalculator.buySimpWithEth(1, ethSwapGasUsed);

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

      // The balance calculator should now match the contract calculation closely

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
      await page.waitForTimeout(1000);

      // Two-step confirmation process:
      // 1. Spending cap approval for token allowance
      await metamask.confirmTransaction();
      await page.waitForTimeout(1000);

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
    await removeLiquidity();
    await buySimpWithEth();
    await buyEthWithSimp();

    // Test error handling scenarios
    await testTransactionRejection();
    await testErrorClearing();

    await testSlippageProtection();
  });
});
