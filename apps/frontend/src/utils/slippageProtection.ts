import {
  calculateSwapOutput,
  calculateAddLiquidityOutput,
  calculateRemoveLiquidityOutput,
} from './ammCalculations';

/**
 * Default slippage tolerance percentage (0.5%)
 */
export const DEFAULT_SLIPPAGE_TOLERANCE = 0.5;

/**
 * Calculates the minimum amount out with slippage protection
 * @param expectedAmount - The expected output amount in wei
 * @param slippageTolerancePercent - Slippage tolerance as percentage (e.g., 0.5 for 0.5%)
 * @returns Minimum amount with slippage protection applied in wei
 */
export const calculateMinAmountWithSlippage = (
  expectedAmount: bigint,
  slippageTolerancePercent: number = DEFAULT_SLIPPAGE_TOLERANCE
): bigint => {
  // Convert percentage to basis points (e.g., 0.5% -> 9950/10000)
  const slippageBasisPoints = BigInt(
    Math.floor((100 - slippageTolerancePercent) * 100)
  );
  return (expectedAmount * slippageBasisPoints) / 10000n;
};

/**
 * Calculates expected LP tokens for adding liquidity
 * Uses the same logic as the smart contract
 */
export const calculateExpectedLPTokens = (
  amountSimplest: bigint,
  amountETH: bigint,
  reserveSimplest: bigint,
  reserveETH: bigint,
  totalLPTokens: bigint
): bigint => {
  return calculateAddLiquidityOutput(
    amountSimplest,
    amountETH,
    reserveETH,
    reserveSimplest,
    totalLPTokens
  );
};

/**
 * Calculates expected token amounts for removing liquidity
 */
export const calculateExpectedRemovalAmounts = (
  lpTokenAmount: bigint,
  reserveSimplest: bigint,
  reserveETH: bigint,
  totalLPTokens: bigint
): { expectedSimplest: bigint; expectedETH: bigint } => {
  const { tokenAmount, ethAmount } = calculateRemoveLiquidityOutput(
    lpTokenAmount,
    reserveETH,
    reserveSimplest,
    totalLPTokens
  );

  return {
    expectedSimplest: tokenAmount,
    expectedETH: ethAmount,
  };
};

/**
 * Calculates expected swap output with 0.3% fee
 * Uses centralized AMM calculation utility
 */
export const calculateExpectedSwapOutput = (
  amountIn: bigint,
  reserveIn: bigint,
  reserveOut: bigint
): bigint => {
  return calculateSwapOutput(amountIn, reserveIn, reserveOut);
};
