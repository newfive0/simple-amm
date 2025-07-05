import { ethers } from 'ethers';

/**
 * Default slippage tolerance percentage (0.5%)
 */
export const DEFAULT_SLIPPAGE_TOLERANCE = 0.5;

/**
 * Calculates the minimum amount out with slippage protection
 * @param expectedAmount - The expected output amount
 * @param slippageTolerancePercent - Slippage tolerance as percentage (e.g., 0.5 for 0.5%)
 * @returns Minimum amount with slippage protection applied
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
  amountSimplest: number,
  amountETH: number,
  reserveSimplest: number,
  reserveETH: number,
  totalLPTokens: number
): bigint => {
  if (totalLPTokens === 0) {
    // First liquidity provision - use sqrt of product
    const product =
      BigInt(Math.floor(amountSimplest * 1e18)) *
      BigInt(Math.floor(amountETH * 1e18));
    return BigInt(Math.floor(Math.sqrt(Number(product))));
  } else {
    // Subsequent liquidity - use minimum of ratios
    const simplestRatio = (amountSimplest * totalLPTokens) / reserveSimplest;
    const ethRatio = (amountETH * totalLPTokens) / reserveETH;
    const minRatio = Math.min(simplestRatio, ethRatio);
    return ethers.parseEther(minRatio.toString());
  }
};

/**
 * Calculates expected token amounts for removing liquidity
 */
export const calculateExpectedRemovalAmounts = (
  lpTokenAmount: number,
  reserveSimplest: number,
  reserveETH: number,
  totalLPTokens: number
): { expectedSimplest: bigint; expectedETH: bigint } => {
  if (totalLPTokens === 0) {
    return { expectedSimplest: 0n, expectedETH: 0n };
  }

  const expectedSimplest = ethers.parseEther(
    ((lpTokenAmount * reserveSimplest) / totalLPTokens).toString()
  );
  const expectedETH = ethers.parseEther(
    ((lpTokenAmount * reserveETH) / totalLPTokens).toString()
  );

  return { expectedSimplest, expectedETH };
};

/**
 * Calculates expected swap output with 0.3% fee
 * Uses constant product formula: (reserveOut * amountIn * 997) / (reserveIn * 1000 + amountIn * 997)
 */
export const calculateExpectedSwapOutput = (
  amountIn: number,
  reserveIn: number,
  reserveOut: number
): bigint => {
  if (reserveIn === 0 || reserveOut === 0) {
    return 0n;
  }

  // Apply 0.3% fee (997/1000)
  const amountInWithFee = Math.floor(amountIn * 997);
  const numerator = reserveOut * amountInWithFee;
  const denominator = reserveIn * 1000 + amountInWithFee;
  const expectedOutput = numerator / denominator;

  return ethers.parseEther(expectedOutput.toString());
};
