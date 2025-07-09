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
