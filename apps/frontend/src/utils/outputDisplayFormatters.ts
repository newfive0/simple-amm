// Utility functions for calculating expected outputs in various components
import { parseUnits, formatUnits } from 'ethers';
import {
  calculateRemoveLiquidityOutput,
  calculateSwapInput,
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
    if (!lpAmountString || lpAmountString === '0' || totalLPTokens === 0n) {
      return '0.0000 SIMP + 0.0000 ETH';
    }

    const lpAmountWei = parseUnits(lpAmountString, 18);
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
 * Calculates required input amount for desired output (reverse swap calculation)
 */
export const createReverseSwapCalculator = (
  poolEthReserve: bigint,
  poolTokenReserve: bigint,
  inputToken: string,
  outputToken: string
) => {
  const isEthToToken = inputToken === 'ETH';

  const getExchangeRate = (): string => {
    if (poolEthReserve === 0n || poolTokenReserve === 0n) return '';

    if (isEthToToken) {
      // Show 1 SIMP = x ETH
      const rate = calculateExchangeRate(poolTokenReserve, poolEthReserve);
      return `1 ${outputToken} ≈ ${rate.toFixed(4)} ${inputToken}`;
    } else {
      // Show 1 ETH = x SIMP
      const rate = calculateExchangeRate(poolEthReserve, poolTokenReserve);
      return `1 ${outputToken} ≈ ${rate.toFixed(4)} ${inputToken}`;
    }
  };

  return (outputAmountString: string): string => {
    if (!outputAmountString || outputAmountString === '0') {
      return getExchangeRate() || `≈ 0 ${inputToken}`;
    }

    if (poolEthReserve === 0n || poolTokenReserve === 0n) {
      return getExchangeRate() || `≈ 0 ${inputToken}`;
    }

    // Convert desired output to wei for calculation
    const outputAmountWei = parseUnits(outputAmountString, 18);

    // Check if output exceeds available reserves
    const availableReserve = isEthToToken ? poolTokenReserve : poolEthReserve;
    if (outputAmountWei >= availableReserve) {
      return 'Exceeds available liquidity';
    }

    let inputAmountWei: bigint;

    if (isEthToToken) {
      // Want SIMP output -> need ETH input
      inputAmountWei = calculateSwapInput(
        outputAmountWei,
        poolEthReserve,
        poolTokenReserve
      );
    } else {
      // Want ETH output -> need SIMP input
      inputAmountWei = calculateSwapInput(
        outputAmountWei,
        poolTokenReserve,
        poolEthReserve
      );
    }

    // If calculation returns 0n, it means the swap is invalid
    if (inputAmountWei === 0n) {
      return 'Exceeds available liquidity';
    }

    // Convert back to display format
    const inputAmount = parseFloat(formatUnits(inputAmountWei, 18));
    return `≈ ${inputAmount.toFixed(4)} ${inputToken}`;
  };
};
