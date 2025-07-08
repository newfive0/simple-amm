import { testWithSynpress } from '@synthetixio/synpress';
import { metaMaskFixtures } from '@synthetixio/synpress/playwright';
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
import { createMetaMask, connectWallet } from './utils/test-helpers';

const test = testWithSynpress(metaMaskFixtures(basicSetup));
const { expect } = test;

test('should display AMM page with disabled elements before connection', async ({
  page,
}) => {
  await page.goto('/');

  await expect(
    page.locator('h1').filter({ hasText: 'Very Simple AMM' })
  ).toBeVisible();

  await expect(
    page.getByRole('button', { name: 'Connect Wallet', exact: true })
  ).toBeVisible({
    timeout: 5000,
  });

  await expect(page.getByText('Your Account: Not Connected')).toBeVisible({
    timeout: 10000,
  });

  const swapSection = page
    .locator('h2')
    .filter({ hasText: 'Swap' })
    .locator('../..');
  await expect(swapSection).toBeVisible();

  await expect(
    swapSection.getByRole('button', { name: 'Please connect wallet' })
  ).toBeVisible();

  await expect(swapSection.getByRole('button', { name: 'ETH' })).toBeDisabled();
  await expect(
    swapSection.getByRole('button', { name: 'SIMP' })
  ).toBeDisabled();

  await expect(page.getByRole('button', { name: 'Add' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Remove' })).toBeDisabled();

  await expect(
    page.getByRole('button', { name: 'Please connect wallet' }).nth(1)
  ).toBeVisible();
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

    // Helper function to handle MetaMask transactions with 3 confirmations and return gas cost
    const handleTripleConfirmation = async (): Promise<number> => {
      await page.waitForTimeout(3000);
      await metamask.confirmTransaction();

      await page.waitForTimeout(3000);
      await metamask.confirmTransaction();

      await page.waitForTimeout(3000);
      await metamask.confirmTransaction();

      await page.waitForTimeout(5000);

      // Get gas costs from the 2 actual blockchain transactions (approve + addLiquidity)
      // Note: First confirmation is just MetaMask's spending cap UI, not a transaction
      return await getGasCostsFromRecentTransactions(2);
    };

    const handleSingleConfirmation = async (): Promise<number> => {
      await page.waitForTimeout(3000);
      await metamask.confirmTransaction();

      return await getGasCostsFromRecentTransactions(1);
    };

    const setupAndConnect = async () => {
      await connectWallet(page, metamask);

      await expect(page.locator('text=Swap').first()).toBeVisible({
        timeout: 10000,
      });
      await expect(page.locator('text=Liquidity').first()).toBeVisible({
        timeout: 10000,
      });

      await expect(page.locator('text=/^Balance:.*SIMP.*ETH/')).toBeVisible({
        timeout: 15000,
      });
      const currentBalances = getCurrentBalances();
      const expectedBalanceText = `Balance: ${currentBalances.simpBalance.toFixed(4)} SIMP | ${currentBalances.ethBalance.toFixed(4)} ETH`;
      const balanceElement = page.getByText('Balance:').locator('..');
      await expect(balanceElement).toHaveText(expectedBalanceText, {
        timeout: 10000,
      });

      await argosScreenshot(page, 'wallet-connected-initial-balances');
    };

    const addLiquidity = async () => {
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
      await ethInput.fill('100');

      const simpInput = liquiditySection.getByPlaceholder('Enter SIMP amount');
      await simpInput.fill('2000');

      await expect(ethInput).toHaveValue('100.0');
      await expect(simpInput).toHaveValue('2000.0');

      const addLiquidityButton = page.getByRole('button', {
        name: 'Add Liquidity',
      });
      await expect(addLiquidityButton).toBeEnabled();

      await addLiquidityButton.click();

      await page.waitForTimeout(2000);
      const proceedButton = page.getByRole('button', { name: 'Proceed' });
      await expect(proceedButton).toBeVisible({ timeout: 5000 });
      await proceedButton.click();

      const gasUsed = await handleTripleConfirmation();

      await expect(page.getByRole('button', { name: 'Waiting...' })).toBeHidden(
        { timeout: 60000 }
      );

      await expect(ethInput).toHaveValue('');
      await expect(simpInput).toHaveValue('');

      updateBalancesAfterAddLiquidity(100, 2000, gasUsed);
      const updatedBalances = getCurrentBalances();
      const expectedBalanceText = `Balance: ${updatedBalances.simpBalance.toFixed(4)} SIMP | ${updatedBalances.ethBalance.toFixed(4)} ETH`;
      const balanceElement = page.getByText('Balance:').locator('..');
      await expect(balanceElement).toHaveText(expectedBalanceText, {
        timeout: 10000,
      });

      await argosScreenshot(page, 'add-liquidity-success');
    };
    const swapEthForSimp = async () => {
      const swapSection = page
        .locator('h2')
        .filter({ hasText: 'Swap' })
        .locator('../..');
      await expect(swapSection.locator('h2')).toBeVisible();

      const simpTab = swapSection.getByRole('button', {
        name: 'SIMP',
        exact: true,
      });
      await expect(simpTab).toBeEnabled();
      await simpTab.click();

      const ethSwapInput = swapSection.getByPlaceholder('ETH → SIMP');
      await expect(ethSwapInput).toBeVisible({ timeout: 5000 });
      await ethSwapInput.fill('1');

      await expect(ethSwapInput).toHaveValue('1.0');

      await expect(swapSection.locator('text=/≈.*SIMP/i')).toBeVisible({
        timeout: 5000,
      });

      const swapEthButton = swapSection
        .locator('button')
        .filter({ hasText: 'Swap ETH for SIMP' });
      await expect(swapEthButton).toBeEnabled();
      await swapEthButton.click();

      const ethSwapGasUsed = await handleSingleConfirmation();

      await expect(
        swapSection.locator('button').filter({ hasText: 'Waiting...' })
      ).toBeHidden({ timeout: 60000 });

      await expect(ethSwapInput).toHaveValue('');

      updateBalancesAfterSwapEthForSimp(1, ethSwapGasUsed);

      const swapUpdatedBalances = getCurrentBalances();
      const expectedBalanceText = `Balance: ${swapUpdatedBalances.simpBalance.toFixed(4)} SIMP | ${swapUpdatedBalances.ethBalance.toFixed(4)} ETH`;
      const balanceElement = page.getByText('Balance:').locator('..');
      await expect(balanceElement).toHaveText(expectedBalanceText, {
        timeout: 10000,
      });

      await argosScreenshot(page, 'swap-eth-to-simp-success');
    };
    const swapSimpForEth = async () => {
      const swapSection = page
        .locator('h2')
        .filter({ hasText: 'Swap' })
        .locator('../..');

      const ethTab = swapSection.getByRole('button', {
        name: 'ETH',
        exact: true,
      });
      await expect(ethTab).toBeEnabled();
      await ethTab.click();

      const simpSwapInput = swapSection.getByPlaceholder('SIMP → ETH');
      await expect(simpSwapInput).toBeVisible({ timeout: 5000 });
      await simpSwapInput.fill('1');

      await expect(simpSwapInput).toHaveValue('1.0');

      await expect(swapSection.locator('text=/≈.*ETH/i')).toBeVisible({
        timeout: 5000,
      });

      const swapSimpButton = swapSection
        .locator('button')
        .filter({ hasText: 'Swap SIMP for ETH' });
      await expect(swapSimpButton).toBeEnabled();
      await swapSimpButton.click();

      // Handle SIMP->ETH swap (3 confirmations for approve + swap)
      const simpToEthGasUsed = await handleTripleConfirmation();

      await expect(
        swapSection.locator('button').filter({ hasText: 'Waiting...' })
      ).toBeHidden({ timeout: 60000 });

      await expect(simpSwapInput).toHaveValue('', { timeout: 10000 });

      updateBalancesAfterSwapSimpForEth(1, simpToEthGasUsed);

      const finalBalances = getCurrentBalances();
      const expectedBalanceText = `Balance: ${finalBalances.simpBalance.toFixed(4)} SIMP | ${finalBalances.ethBalance.toFixed(4)} ETH`;
      const balanceElement = page.getByText('Balance:').locator('..');
      await expect(balanceElement).toHaveText(expectedBalanceText, {
        timeout: 10000,
      });

      await argosScreenshot(page, 'swap-simp-to-eth-success');
    };

    await initializeCalculator();
    const contractManipulation = async () => {
      const { ContractManipulator } = await import(
        './utils/contract-manipulator'
      );

      const manipulator = new ContractManipulator();

      console.log('[Step 5] Starting contract manipulation operations...');

      console.log('[Step 5] Getting pool state after UI operations...');
      const initialState = await manipulator.getPoolState();
      console.log('[Step 5] Pool state after UI operations:', {
        ethReserve: initialState.ethReserve.toString(),
        tokenReserve: initialState.tokenReserve.toString(),
        totalLPTokens: initialState.totalLPTokens.toString(),
      });

      await expect(
        manipulator.swapEthForTokens(BigInt(1e18))
      ).resolves.not.toThrow();

      await expect(
        manipulator.addLiquidity(BigInt(0.5e18), BigInt(10e18))
      ).resolves.not.toThrow();

      const finalState = await manipulator.getPoolState();
      expect(finalState.ethReserve).toBeGreaterThan(initialState.ethReserve);
      expect(finalState.tokenReserve).toBeLessThan(initialState.tokenReserve);
      expect(finalState.totalLPTokens).toBeGreaterThan(
        initialState.totalLPTokens
      );

      expect(initialState.ethReserve).toBeGreaterThan(BigInt(100e18));
      expect(initialState.tokenReserve).toBeGreaterThan(BigInt(1900e18));
      expect(initialState.totalLPTokens).toBeGreaterThan(BigInt(400e18));

      const ethInPool = Number(initialState.ethReserve) / 1e18;
      const simpInPool = Number(initialState.tokenReserve) / 1e18;
      console.log(
        `[Step 5] Pool contains ${ethInPool.toFixed(2)} ETH and ${simpInPool.toFixed(0)} SIMP tokens`
      );
      console.log(
        '[Step 5] Successfully demonstrated thousands of tokens in the pool'
      );

      console.log(
        '[Step 5] Contract manipulation framework is working correctly'
      );

      console.log(
        '[Step 5] Contract manipulation operations completed successfully'
      );

      await argosScreenshot(page, 'contract-manipulation-complete');
    };

    await setupAndConnect();
    await addLiquidity();
    await swapEthForSimp();
    await swapSimpForEth();
    await contractManipulation();
  });
});
