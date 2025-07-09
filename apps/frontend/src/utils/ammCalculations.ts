/**
 * Utility functions for AMM (Automated Market Maker) calculations
 * All calculations use wei (BigInt) as base unit for precision
 * Components should format values for display
 */

/**
 * AMM fee percentage (0.3%)
 */
export const AMM_FEE_PERCENT = 0.3;
export const AMM_FEE_BASIS_POINTS = 997; // 100% - 0.3% = 99.7% = 997/1000

/**
 * Calculates swap output using constant product formula with fee
 * Formula: amountOut = (reserveOut * amountInWithFee) / (reserveIn + amountInWithFee)
 * where amountInWithFee = amountIn * 997 / 1000 (0.3% fee)
 *
 * @param amountIn Input amount in wei
 * @param reserveIn Reserve of input token in wei
 * @param reserveOut Reserve of output token in wei
 * @returns Output amount in wei
 */
export function calculateSwapOutput(
  amountIn: bigint,
  reserveIn: bigint,
  reserveOut: bigint
): bigint {
  if (amountIn <= 0n || reserveIn <= 0n || reserveOut <= 0n) {
    return 0n;
  }

  // Apply 0.3% fee exactly as contract does
  const amountInWithFee = (amountIn * BigInt(AMM_FEE_BASIS_POINTS)) / 1000n;

  // Constant product formula
  return (reserveOut * amountInWithFee) / (reserveIn + amountInWithFee);
}

/**
 * Calculates required token amount for adding liquidity to maintain pool ratio
 *
 * @param ethAmount ETH amount to add in wei
 * @param poolEthReserve Current ETH reserve in pool in wei
 * @param poolTokenReserve Current token reserve in pool in wei
 * @returns Required token amount in wei to maintain ratio
 */
export function calculateRequiredTokenAmount(
  ethAmount: bigint,
  poolEthReserve: bigint,
  poolTokenReserve: bigint
): bigint {
  if (ethAmount <= 0n || poolEthReserve <= 0n || poolTokenReserve <= 0n) {
    return 0n;
  }

  return (ethAmount * poolTokenReserve) / poolEthReserve;
}

/**
 * Calculates required ETH amount for adding liquidity to maintain pool ratio
 *
 * @param tokenAmount Token amount to add in wei
 * @param poolEthReserve Current ETH reserve in pool in wei
 * @param poolTokenReserve Current token reserve in pool in wei
 * @returns Required ETH amount in wei to maintain ratio
 */
export function calculateRequiredEthAmount(
  tokenAmount: bigint,
  poolEthReserve: bigint,
  poolTokenReserve: bigint
): bigint {
  if (tokenAmount <= 0n || poolEthReserve <= 0n || poolTokenReserve <= 0n) {
    return 0n;
  }

  return (tokenAmount * poolEthReserve) / poolTokenReserve;
}

/**
 * Calculates token amounts received when removing liquidity
 *
 * @param lpTokenAmount LP tokens to remove in wei
 * @param poolEthReserve Current ETH reserve in pool in wei
 * @param poolTokenReserve Current token reserve in pool in wei
 * @param totalLPTokens Total LP tokens in circulation in wei
 * @returns Object with ETH and token amounts to receive in wei
 */
export function calculateRemoveLiquidityOutput(
  lpTokenAmount: bigint,
  poolEthReserve: bigint,
  poolTokenReserve: bigint,
  totalLPTokens: bigint
): { ethAmount: bigint; tokenAmount: bigint } {
  if (lpTokenAmount <= 0n || totalLPTokens <= 0n) {
    return { ethAmount: 0n, tokenAmount: 0n };
  }

  const ethAmount = (lpTokenAmount * poolEthReserve) / totalLPTokens;
  const tokenAmount = (lpTokenAmount * poolTokenReserve) / totalLPTokens;

  return { ethAmount, tokenAmount };
}

/**
 * Calculates LP tokens received when adding liquidity
 *
 * @param tokenAmount Token amount to add in wei
 * @param ethAmount ETH amount to add in wei
 * @param poolEthReserve Current ETH reserve in pool in wei
 * @param poolTokenReserve Current token reserve in pool in wei
 * @param totalLPTokens Total LP tokens in circulation in wei
 * @returns LP tokens to receive in wei
 */
export function calculateAddLiquidityOutput(
  tokenAmount: bigint,
  ethAmount: bigint,
  poolEthReserve: bigint,
  poolTokenReserve: bigint,
  totalLPTokens: bigint
): bigint {
  if (totalLPTokens === 0n) {
    // First liquidity provision - use sqrt of product
    // Convert to Number for sqrt calculation, then back to BigInt
    const product = tokenAmount * ethAmount;
    const sqrtProduct = BigInt(Math.floor(Math.sqrt(Number(product))));
    return sqrtProduct;
  } else {
    // Subsequent liquidity - use minimum of ratios
    const tokenRatio = (tokenAmount * totalLPTokens) / poolTokenReserve;
    const ethRatio = (ethAmount * totalLPTokens) / poolEthReserve;
    return tokenRatio < ethRatio ? tokenRatio : ethRatio;
  }
}

/**
 * Calculates required input amount to get desired output amount
 * This is the inverse of calculateSwapOutput
 * Formula: amountIn = (reserveIn * amountOut) / ((reserveOut - amountOut) * 997) * 1000
 *
 * @param amountOut Desired output amount in wei
 * @param reserveIn Reserve of input token in wei
 * @param reserveOut Reserve of output token in wei
 * @returns Required input amount in wei
 */
export function calculateSwapInput(
  amountOut: bigint,
  reserveIn: bigint,
  reserveOut: bigint
): bigint {
  if (amountOut <= 0n || reserveIn <= 0n || reserveOut <= 0n) {
    return 0n;
  }

  // Ensure we don't try to get more than available
  if (amountOut >= reserveOut) {
    return 0n;
  }

  // Inverse of the constant product formula with fee
  // amountIn = (reserveIn * amountOut) / ((reserveOut - amountOut) * 997) * 1000
  const numerator = reserveIn * amountOut * 1000n;
  const denominator = (reserveOut - amountOut) * BigInt(AMM_FEE_BASIS_POINTS);

  return numerator / denominator;
}

/**
 * Calculates simple exchange rate between two tokens
 *
 * @param reserveIn Reserve of input token in wei
 * @param reserveOut Reserve of output token in wei
 * @returns Exchange rate as number (how much output per 1 unit of input)
 */
export function calculateExchangeRate(
  reserveIn: bigint,
  reserveOut: bigint
): number {
  if (reserveIn <= 0n || reserveOut <= 0n) {
    return 0;
  }

  // Convert to numbers for rate calculation
  const reserveInNum = Number(reserveIn);
  const reserveOutNum = Number(reserveOut);

  return reserveOutNum / reserveInNum;
}
