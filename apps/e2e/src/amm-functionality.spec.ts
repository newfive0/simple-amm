import { testWithSynpress } from '@synthetixio/synpress';
import { MetaMask, metaMaskFixtures } from '@synthetixio/synpress/playwright';
import { argosScreenshot } from '@argos-ci/playwright';
import basicSetup from '../test/wallet-setup/basic.setup';
import {
  initializeCalculator,
  getCurrentBalances,
  updateBalancesAfterAddLiquidity,
  updateBalancesAfterSwapEthForSimp,
  updateBalancesAfterSwapSimpForEth,
} from './utils/balance-calculator';
import { getGasCostsFromRecentTransactions } from './utils/gas-tracker';

const test = testWithSynpress(metaMaskFixtures(basicSetup));
const { expect } = test;

test('should display AMM page with disabled elements before connection', async ({
  page,
}) => {
  await page.goto('/');

  // Wait for the main heading to be visible
  await expect(
    page.locator('h1').filter({ hasText: 'Very Simple AMM' })
  ).toBeVisible();

  // Wait for the connect wallet button in header to be visible
  await expect(
    page.getByRole('button', { name: 'Connect Wallet', exact: true })
  ).toBeVisible({
    timeout: 5000,
  });

  await expect(page.getByText('Your Account: Not Connected')).toBeVisible({
    timeout: 10000,
  });

  // Wait for disabled swap and liquidity elements to be visible
  const swapSection = page
    .locator('h2')
    .filter({ hasText: 'Swap' })
    .locator('..');
  await expect(
    swapSection.getByRole('button', { name: 'Please connect wallet' })
  ).toBeVisible();

  // Check that swap direction tabs (Receive ETH/SIMP) are disabled
  await expect(page.getByRole('button', { name: 'ETH' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'SIMP' })).toBeDisabled();

  // Check that Add/Remove tabs are disabled
  await expect(page.getByRole('button', { name: 'Add' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Remove' })).toBeDisabled();

  // Check that there's a disabled action button in liquidity section
  await expect(
    page.getByRole('button', { name: 'Please connect wallet' }).nth(1)
  ).toBeVisible();

  // Take screenshot of the initial AMM state before connection
  await argosScreenshot(page, 'amm-before-connection');
});

test.describe('AMM Functionality', () => {
  test('should add liquidity then perform swaps', async ({
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

    // Helper function to handle MetaMask transactions with 3 confirmations and return gas cost
    const handleTripleConfirmation = async (): Promise<number> => {
      await page.waitForTimeout(3000);
      await metamask.confirmTransaction();

      await page.waitForTimeout(3000);
      await metamask.confirmTransaction();

      await page.waitForTimeout(3000);
      await metamask.confirmTransaction();

      // Wait a bit for transactions to be mined
      await page.waitForTimeout(5000);

      // Get gas costs from the 2 actual blockchain transactions (approve + addLiquidity)
      // Note: First confirmation is just MetaMask's spending cap UI, not a transaction
      return await getGasCostsFromRecentTransactions(2);
    };

    // Helper function to handle single MetaMask transaction and return gas cost
    const handleSingleConfirmation = async (): Promise<number> => {
      await page.waitForTimeout(3000);
      await metamask.confirmTransaction();

      // Get gas cost from the transaction we just made
      return await getGasCostsFromRecentTransactions(1);
    };

    // STEP 1: Setup and connect wallet
    const setupAndConnect = async () => {
      await page.goto('/');
      await page
        .locator('button')
        .filter({ hasText: /connect/i })
        .first()
        .click();
      await metamask.connectToDapp();

      // Wait for connection to be established
      await expect(
        page.locator('text=Connected').or(page.locator('text=0x')).first()
      ).toBeVisible({ timeout: 30000 });

      // Wait for AMM interface to load
      await expect(page.locator('text=Swap').first()).toBeVisible({
        timeout: 10000,
      });
      await expect(page.locator('text=Liquidity').first()).toBeVisible({
        timeout: 10000,
      });

      // Wait for balance data to load
      await expect(page.locator('text=/^Balance:.*SIMP.*ETH/')).toBeVisible({
        timeout: 15000,
      });

      // Wait for specific initial balances
      const currentBalances = getCurrentBalances();
      const expectedBalanceText = `Balance: ${currentBalances.simpBalance.toFixed(4)} SIMP | ${currentBalances.ethBalance.toFixed(4)} ETH`;
      const balanceElement = page.getByText('Balance:').locator('..');
      await expect(balanceElement).toHaveText(expectedBalanceText, {
        timeout: 10000,
      });

      // Take screenshot after successful connection with initial balances
      await argosScreenshot(page, 'wallet-connected-initial-balances');
    };

    // STEP 2: Add liquidity (10 ETH + 20 SIMP)
    const addLiquidity = async () => {
      // Wait for Liquidity section to be visible
      await expect(
        page.getByRole('heading', { name: 'Liquidity' })
      ).toBeVisible();

      // Ensure we're on the Add tab (should be default)
      const addTab = page.getByRole('button', { name: 'Add', exact: true });
      await expect(addTab).toBeVisible();
      await addTab.click(); // Click to ensure it's active

      // Get the liquidity section - go up from the h2 to the main container
      const liquiditySection = page
        .getByRole('heading', { name: 'Liquidity' })
        .locator('../..');

      // Wait for the input fields to appear after clicking Add tab
      await expect(
        liquiditySection.getByPlaceholder('Enter ETH amount')
      ).toBeVisible({ timeout: 10000 });

      // Fill in ETH amount (10 ETH)
      const ethInput = liquiditySection.getByPlaceholder('Enter ETH amount');
      await ethInput.fill('10');

      // Fill in SIMP amount (20 SIMP)
      const simpInput = liquiditySection.getByPlaceholder('Enter SIMP amount');
      await simpInput.fill('20');

      // Verify inputs are filled correctly
      await expect(ethInput).toHaveValue('10');
      await expect(simpInput).toHaveValue('20');

      // Click Add Liquidity button and track gas usage
      const addLiquidityButton = page.getByRole('button', {
        name: 'Add Liquidity',
      });
      await expect(addLiquidityButton).toBeEnabled();

      // Perform add liquidity operation
      await addLiquidityButton.click();
      const gasUsed = await handleTripleConfirmation();

      // Wait for transaction to complete
      await expect(page.getByRole('button', { name: 'Waiting...' })).toBeHidden(
        { timeout: 60000 }
      );

      // Verify inputs are cleared after successful transaction
      await expect(ethInput).toHaveValue('');
      await expect(simpInput).toHaveValue('');

      // Update balance calculations after adding liquidity with actual gas cost
      updateBalancesAfterAddLiquidity(10, 20, gasUsed);

      // Wait for balances to update to expected values
      const updatedBalances = getCurrentBalances();
      const expectedBalanceText = `Balance: ${updatedBalances.simpBalance.toFixed(4)} SIMP | ${updatedBalances.ethBalance.toFixed(4)} ETH`;
      const balanceElement = page.getByText('Balance:').locator('..');
      await expect(balanceElement).toHaveText(expectedBalanceText, {
        timeout: 10000,
      });

      // Take screenshot after liquidity addition
      await argosScreenshot(page, 'add-liquidity-success');
    };

    // STEP 3: Swap 1 ETH for SIMP
    const swapEthForSimp = async () => {
      const swapSection = page
        .locator('h2')
        .filter({ hasText: 'Swap' })
        .locator('..');
      await expect(swapSection.locator('h2')).toBeVisible();

      // Select ETH to SIMP direction by clicking the SIMP tab (to receive SIMP)
      const simpTab = page.getByRole('button', { name: 'SIMP' });
      await expect(simpTab).toBeEnabled();
      await simpTab.click();

      // Fill in ETH amount to swap (1 ETH) - use placeholder "ETH → SIMP"
      const ethSwapInput = swapSection.getByPlaceholder('ETH → SIMP');
      await ethSwapInput.fill('1');

      // Verify the input is filled
      await expect(ethSwapInput).toHaveValue('1');

      // Wait for SIMP output calculation to appear
      await expect(swapSection.locator('text=/≈.*SIMP/i')).toBeVisible({
        timeout: 5000,
      });

      // Click Swap ETH for SIMP button
      const swapEthButton = swapSection
        .locator('button')
        .filter({ hasText: 'Swap ETH for SIMP' });
      await expect(swapEthButton).toBeEnabled();
      await swapEthButton.click();

      // Handle single confirmation and get gas cost
      const ethSwapGasUsed = await handleSingleConfirmation();

      // Wait for transaction to complete
      await expect(
        swapSection.locator('button').filter({ hasText: 'Waiting...' })
      ).toBeHidden({ timeout: 60000 });

      // Verify input is cleared after successful swap
      await expect(ethSwapInput).toHaveValue('');

      // Update balance calculations after ETH to SIMP swap
      updateBalancesAfterSwapEthForSimp(1, ethSwapGasUsed);

      // Wait for balances to update to expected values
      const swapUpdatedBalances = getCurrentBalances();
      const expectedBalanceText = `Balance: ${swapUpdatedBalances.simpBalance.toFixed(4)} SIMP | ${swapUpdatedBalances.ethBalance.toFixed(4)} ETH`;
      const balanceElement = page.getByText('Balance:').locator('..');
      await expect(balanceElement).toHaveText(expectedBalanceText, {
        timeout: 10000,
      });

      // Take screenshot after ETH to SIMP swap
      await argosScreenshot(page, 'swap-eth-to-simp-success');
    };

    // STEP 4: Swap 1 SIMP for ETH
    const swapSimpForEth = async () => {
      const swapSection = page
        .locator('h2')
        .filter({ hasText: 'Swap' })
        .locator('..');

      // Switch swap direction to SIMP → ETH by clicking the ETH tab (to receive ETH)
      const ethTab = page.getByRole('button', { name: 'ETH' });
      await expect(ethTab).toBeEnabled();
      await ethTab.click();

      // Fill in SIMP amount to swap (1 SIMP) - use placeholder "SIMP → ETH"
      const simpSwapInput = swapSection.getByPlaceholder('SIMP → ETH');
      await simpSwapInput.fill('1');

      // Verify the input is filled
      await expect(simpSwapInput).toHaveValue('1');

      // Wait for ETH output calculation to appear
      await expect(swapSection.locator('text=/≈.*ETH/i')).toBeVisible({
        timeout: 5000,
      });

      // Click Swap SIMP for ETH button
      const swapSimpButton = swapSection
        .locator('button')
        .filter({ hasText: 'Swap SIMP for ETH' });
      await expect(swapSimpButton).toBeEnabled();
      await swapSimpButton.click();

      // Handle SIMP->ETH swap (3 confirmations for approve + swap)
      const simpToEthGasUsed = await handleTripleConfirmation();

      // Wait for transaction to complete
      await expect(
        swapSection.locator('button').filter({ hasText: 'Waiting...' })
      ).toBeHidden({ timeout: 60000 });

      // Verify input is cleared after successful swap
      await expect(simpSwapInput).toHaveValue('', { timeout: 10000 });

      // Update balance calculations after SIMP to ETH swap with actual gas cost
      updateBalancesAfterSwapSimpForEth(1, simpToEthGasUsed);

      // Wait for balances to update to expected values
      const finalBalances = getCurrentBalances();
      const expectedBalanceText = `Balance: ${finalBalances.simpBalance.toFixed(4)} SIMP | ${finalBalances.ethBalance.toFixed(4)} ETH`;
      const balanceElement = page.getByText('Balance:').locator('..');
      await expect(balanceElement).toHaveText(expectedBalanceText, {
        timeout: 10000,
      });

      // Take final screenshot after SIMP to ETH swap
      await argosScreenshot(page, 'swap-simp-to-eth-success');
    };

    // Initialize the calculator with starting balances and reserves
    initializeCalculator();

    // Execute all steps
    await setupAndConnect();
    await addLiquidity();
    await swapEthForSimp();
    await swapSimpForEth();
  });
});
