// Utility functions for calculating expected outputs in various components
import { parseUnits, formatUnits } from 'ethers';
import {
  calculateRemoveLiquidityOutput,
  calculateSwapOutput,
  calculateExchangeRate,
} from './ammCalculations';

/**
 * Calculates expected output for removing liquidity
 */
export const createRemoveLiquidityOutputCalculator = (
  poolEthReserve: bigint,
  poolTokenReserve: bigint,
  totalLPTokens: bigint
) => {
  return (lpAmountString: string): string => {
    const lpAmount = parseFloat(lpAmountString);

    if (!lpAmount || lpAmount <= 0 || totalLPTokens === 0n) {
      return '0.0000 SIMP + 0.0000 ETH';
    }

    const lpAmountWei = parseUnits(lpAmount.toString(), 18);
    const { ethAmount, tokenAmount } = calculateRemoveLiquidityOutput(
      lpAmountWei,
      poolEthReserve,
      poolTokenReserve,
      totalLPTokens
    );

    const ethAmountFormatted = parseFloat(formatUnits(ethAmount, 18));
    const tokenAmountFormatted = parseFloat(formatUnits(tokenAmount, 18));

    return `${tokenAmountFormatted.toFixed(4)} SIMP + ${ethAmountFormatted.toFixed(4)} ETH`;
  };
};

/**
 * Calculates expected output for swap operations
 */
export const createSwapOutputCalculator = (
  poolEthReserve: bigint,
  poolTokenReserve: bigint,
  inputToken: string,
  outputToken: string
) => {
  const isEthToToken = inputToken === 'ETH';

  const getExchangeRate = (): string => {
    if (poolEthReserve === 0n || poolTokenReserve === 0n) return '';

    if (isEthToToken) {
      // Show 1 ETH = x SIMP
      const rate = calculateExchangeRate(poolEthReserve, poolTokenReserve);
      return `1 ${inputToken} ≈ ${rate.toFixed(4)} ${outputToken}`;
    } else {
      // Show 1 SIMP = x ETH
      const rate = calculateExchangeRate(poolTokenReserve, poolEthReserve);
      return `1 ${inputToken} ≈ ${rate.toFixed(6)} ${outputToken}`;
    }
  };

  return (inputAmountString: string): string => {
    const inputAmount = parseFloat(inputAmountString);

    if (!inputAmount || inputAmount <= 0) {
      return getExchangeRate() || `≈ 0 ${outputToken}`;
    }

    if (poolEthReserve === 0n || poolTokenReserve === 0n) {
      return getExchangeRate() || `≈ 0 ${outputToken}`;
    }

    // Convert input to wei for calculation
    const inputAmountWei = parseUnits(inputAmount.toString(), 18);
    let outputAmountWei: bigint;

    if (isEthToToken) {
      // ETH input -> Token output
      outputAmountWei = calculateSwapOutput(
        inputAmountWei,
        poolEthReserve,
        poolTokenReserve
      );
    } else {
      // Token input -> ETH output
      outputAmountWei = calculateSwapOutput(
        inputAmountWei,
        poolTokenReserve,
        poolEthReserve
      );
    }

    // Convert back to display format
    const outputAmount = parseFloat(formatUnits(outputAmountWei, 18));
    return `≈ ${outputAmount.toFixed(6)} ${outputToken}`;
  };
};
