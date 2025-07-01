// Utility functions for calculating expected outputs in various components

/**
 * Calculates expected output for removing liquidity
 */
export const createRemoveLiquidityOutputCalculator = (
  poolEthReserve: number,
  poolTokenReserve: number,
  totalLPTokens: number,
  tokenSymbol: string
) => {
  return (lpAmountString: string): string => {
    const lpAmount = parseFloat(lpAmountString);

    if (!lpAmount || lpAmount <= 0 || totalLPTokens === 0) {
      return '0.0000 SIMP + 0.0000 ETH';
    }

    const ethAmount = (lpAmount * poolEthReserve) / totalLPTokens;
    const tokenAmount = (lpAmount * poolTokenReserve) / totalLPTokens;

    return `${tokenAmount.toFixed(4)} ${tokenSymbol} + ${ethAmount.toFixed(
      4
    )} ETH`;
  };
};

/**
 * Calculates expected output for swap operations
 */
export const createSwapOutputCalculator = (
  poolEthReserve: number,
  poolTokenReserve: number,
  inputToken: string,
  outputToken: string
) => {
  const isEthToToken = inputToken === 'ETH';

  const getExchangeRate = (): string => {
    if (poolEthReserve === 0 || poolTokenReserve === 0) return '';

    if (isEthToToken) {
      // Show 1 ETH = x SIMP
      const rate = poolTokenReserve / poolEthReserve;
      return `1 ${inputToken} ≈ ${rate.toFixed(4)} ${outputToken}`;
    } else {
      // Show 1 SIMP = x ETH
      const rate = poolEthReserve / poolTokenReserve;
      return `1 ${inputToken} ≈ ${rate.toFixed(6)} ${outputToken}`;
    }
  };

  return (inputAmountString: string): string => {
    const inputAmount = parseFloat(inputAmountString);

    if (!inputAmount || inputAmount <= 0) {
      return getExchangeRate() || `≈ 0 ${outputToken}`;
    }

    if (poolEthReserve === 0 || poolTokenReserve === 0) {
      return getExchangeRate() || `≈ 0 ${outputToken}`;
    }

    // Using constant product formula: x * y = k
    // Output = (y * inputX) / (x + inputX)
    let outputAmount: number;

    if (isEthToToken) {
      // ETH input -> Token output
      outputAmount =
        (poolTokenReserve * inputAmount) / (poolEthReserve + inputAmount);
    } else {
      // Token input -> ETH output
      outputAmount =
        (poolEthReserve * inputAmount) / (poolTokenReserve + inputAmount);
    }

    return `≈ ${outputAmount.toFixed(6)} ${outputToken}`;
  };
};
