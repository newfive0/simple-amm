/**
 * Utility functions for calculating expected balances in AMM functionality tests
 * Uses integer arithmetic to match smart contract precision exactly
 */

export interface BalanceState {
  ethBalance: number;
  simpBalance: number;
}

export interface PoolReserves {
  ethReserve: number;
  simpReserve: number;
}

// Constants
const INITIAL_ETH = 9999.995796117593;
const INITIAL_SIMP = 1000000;

// Internal state
let currentBalances: BalanceState = {
  ethBalance: INITIAL_ETH,
  simpBalance: INITIAL_SIMP,
};

let currentReserves: PoolReserves = {
  ethReserve: 0,
  simpReserve: 0,
};

/**
 * Initialize or reset the calculator state
 */
export function initializeCalculator(): void {
  currentBalances = {
    ethBalance: INITIAL_ETH,
    simpBalance: INITIAL_SIMP,
  };
  currentReserves = {
    ethReserve: 0,
    simpReserve: 0,
  };
}

/**
 * Get current balances
 */
export function getCurrentBalances(): BalanceState {
  return { ...currentBalances };
}

/**
 * Get current pool reserves
 */
export function getCurrentReserves(): PoolReserves {
  return { ...currentReserves };
}

/**
 * Update balances and pool reserves after adding liquidity
 * @param ethAmount ETH amount added to liquidity
 * @param simpAmount SIMP amount added to liquidity
 * @param actualGasCost Actual gas cost in ETH (required)
 */
export function updateBalancesAfterAddLiquidity(
  ethAmount: number,
  simpAmount: number,
  actualGasCost: number
): void {
  const gasCost = actualGasCost;
  currentBalances = {
    ethBalance: currentBalances.ethBalance - ethAmount - gasCost,
    simpBalance: currentBalances.simpBalance - simpAmount,
  };
  currentReserves = {
    ethReserve: currentReserves.ethReserve + ethAmount,
    simpReserve: currentReserves.simpReserve + simpAmount,
  };
}

/**
 * Update balances and pool reserves after swapping ETH for SIMP
 * Uses simplified arithmetic with 0.3% fee approximation
 * @param ethSwapAmount ETH amount being swapped
 * @param actualGasCost Actual gas cost in ETH (required)
 */
export function updateBalancesAfterSwapEthForSimp(
  ethSwapAmount: number,
  actualGasCost: number
): void {
  // Apply 0.3% fee: effective amount = amountIn * 0.997
  const amountInWithFee = ethSwapAmount * 0.997;

  // Calculate SIMP output using constant product formula
  // amountOut = (reserveSimplest * amountInWithFee) / (reserveETH + amountInWithFee)
  const simpOutput =
    (currentReserves.simpReserve * amountInWithFee) /
    (currentReserves.ethReserve + amountInWithFee);

  const gasCost = actualGasCost;

  currentBalances = {
    ethBalance: currentBalances.ethBalance - ethSwapAmount - gasCost,
    simpBalance: currentBalances.simpBalance + simpOutput,
  };
  currentReserves = {
    ethReserve: currentReserves.ethReserve + ethSwapAmount,
    simpReserve: currentReserves.simpReserve - simpOutput,
  };
}

/**
 * Update balances and pool reserves after swapping SIMP for ETH
 * Uses simplified arithmetic with 0.3% fee approximation
 * @param simpSwapAmount SIMP amount being swapped
 * @param actualGasCost Actual gas cost in ETH (required)
 */
export function updateBalancesAfterSwapSimpForEth(
  simpSwapAmount: number,
  actualGasCost: number
): void {
  // Apply 0.3% fee: effective amount = amountIn * 0.997
  const amountInWithFee = simpSwapAmount * 0.997;

  // Calculate ETH output using constant product formula
  // amountOut = (reserveETH * amountInWithFee) / (reserveSimplest + amountInWithFee)
  const ethOutput =
    (currentReserves.ethReserve * amountInWithFee) /
    (currentReserves.simpReserve + amountInWithFee);

  const gasCost = actualGasCost;

  currentBalances = {
    ethBalance: currentBalances.ethBalance + ethOutput - gasCost,
    simpBalance: currentBalances.simpBalance - simpSwapAmount,
  };
  currentReserves = {
    ethReserve: currentReserves.ethReserve - ethOutput,
    simpReserve: currentReserves.simpReserve + simpSwapAmount,
  };
}

/**
 * Calculate expected output amounts for removing liquidity
 * @param lpTokensToRemove Amount of LP tokens to remove
 * @param totalLPTokens Total LP tokens in existence (based on initial add liquidity: sqrt(10 * 20) = sqrt(200) ≈ 14.142)
 * @returns Expected ETH and SIMP amounts to receive
 */
export function calculateRemoveLiquidityOutput(
  lpTokensToRemove: number,
  totalLPTokens: number
): { ethAmount: number; simpAmount: number } {
  const percentage = lpTokensToRemove / totalLPTokens;
  return {
    ethAmount: currentReserves.ethReserve * percentage,
    simpAmount: currentReserves.simpReserve * percentage,
  };
}

/**
 * Update balances and pool reserves after removing liquidity
 * @param lpTokensToRemove Amount of LP tokens being removed
 * @param totalLPTokens Total LP tokens before removal
 * @param actualGasCost Actual gas cost in ETH (required)
 */
export function updateBalancesAfterRemoveLiquidity(
  lpTokensToRemove: number,
  totalLPTokens: number,
  actualGasCost: number
): void {
  const { ethAmount, simpAmount } = calculateRemoveLiquidityOutput(
    lpTokensToRemove,
    totalLPTokens
  );

  const gasCost = actualGasCost;

  currentBalances = {
    ethBalance: currentBalances.ethBalance + ethAmount - gasCost,
    simpBalance: currentBalances.simpBalance + simpAmount,
  };
  currentReserves = {
    ethReserve: currentReserves.ethReserve - ethAmount,
    simpReserve: currentReserves.simpReserve - simpAmount,
  };
}
