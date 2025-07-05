import { describe, it, expect } from 'vitest';
import { parseUnits, formatUnits } from 'ethers';
import {
  calculateSwapOutput,
  calculateRequiredTokenAmount,
  calculateRequiredEthAmount,
  calculateRemoveLiquidityOutput,
  calculateAddLiquidityOutput,
  calculateExchangeRate,
  AMM_FEE_PERCENT,
  AMM_FEE_BASIS_POINTS,
} from './ammCalculations';

describe('ammCalculations', () => {
  describe('Constants', () => {
    it('should have correct fee constants', () => {
      expect(AMM_FEE_PERCENT).toBe(0.3);
      expect(AMM_FEE_BASIS_POINTS).toBe(997);
    });
  });

  describe('Wei conversion utilities', () => {
    it('should convert wei to ETH correctly', () => {
      expect(formatUnits(1000000000000000000n, 18)).toBe('1.0'); // 1 ETH
      expect(formatUnits(500000000000000000n, 18)).toBe('0.5'); // 0.5 ETH
      expect(formatUnits(0n, 18)).toBe('0.0');
    });

    it('should convert ETH to wei correctly', () => {
      expect(parseUnits('1', 18)).toBe(1000000000000000000n); // 1 ETH
      expect(parseUnits('0.5', 18)).toBe(500000000000000000n); // 0.5 ETH
      expect(parseUnits('0', 18)).toBe(0n);
    });
  });

  describe('calculateSwapOutput', () => {
    it('should calculate swap output with 0.3% fee', () => {
      const amountIn = parseUnits('1', 18); // 1 ETH
      const reserveIn = parseUnits('10', 18); // 10 ETH
      const reserveOut = parseUnits('20', 18); // 20 tokens

      const result = calculateSwapOutput(amountIn, reserveIn, reserveOut);
      const resultEth = parseFloat(formatUnits(result, 18));

      // Expected: (20 * (1 * 997 / 1000)) / (10 + (1 * 997 / 1000))
      // = (20 * 0.997) / (10 + 0.997) = 19.94 / 10.997 ≈ 1.8132
      expect(resultEth).toBeCloseTo(1.8132, 3);
    });

    it('should return 0 for invalid inputs', () => {
      expect(
        calculateSwapOutput(0n, parseUnits('10', 18), parseUnits('20', 18))
      ).toBe(0n);
      expect(
        calculateSwapOutput(parseUnits('1', 18), 0n, parseUnits('20', 18))
      ).toBe(0n);
      expect(
        calculateSwapOutput(parseUnits('1', 18), parseUnits('10', 18), 0n)
      ).toBe(0n);
    });

    it('should handle large numbers correctly', () => {
      const amountIn = parseUnits('1000', 18);
      const reserveIn = parseUnits('10000', 18);
      const reserveOut = parseUnits('20000', 18);

      const result = calculateSwapOutput(amountIn, reserveIn, reserveOut);
      expect(result).toBeGreaterThan(0n);
    });
  });

  describe('calculateRequiredTokenAmount', () => {
    it('should calculate proportional token amount', () => {
      const ethAmount = parseUnits('5', 18);
      const poolEthReserve = parseUnits('10', 18);
      const poolTokenReserve = parseUnits('20', 18);

      const result = calculateRequiredTokenAmount(
        ethAmount,
        poolEthReserve,
        poolTokenReserve
      );
      const resultEth = parseFloat(formatUnits(result, 18));

      // 5 ETH * (20 tokens / 10 ETH) = 10 tokens
      expect(resultEth).toBe(10);
    });

    it('should return 0 for invalid inputs', () => {
      expect(
        calculateRequiredTokenAmount(
          0n,
          parseUnits('10', 18),
          parseUnits('20', 18)
        )
      ).toBe(0n);
      expect(
        calculateRequiredTokenAmount(
          parseUnits('5', 18),
          0n,
          parseUnits('20', 18)
        )
      ).toBe(0n);
      expect(
        calculateRequiredTokenAmount(
          parseUnits('5', 18),
          parseUnits('10', 18),
          0n
        )
      ).toBe(0n);
    });

    it('should handle fractional amounts', () => {
      const ethAmount = parseUnits('2.5', 18);
      const poolEthReserve = parseUnits('10', 18);
      const poolTokenReserve = parseUnits('30', 18);

      const result = calculateRequiredTokenAmount(
        ethAmount,
        poolEthReserve,
        poolTokenReserve
      );
      const resultEth = parseFloat(formatUnits(result, 18));

      // 2.5 ETH * (30 tokens / 10 ETH) = 7.5 tokens
      expect(resultEth).toBeCloseTo(7.5, 10);
    });
  });

  describe('calculateRequiredEthAmount', () => {
    it('should calculate proportional ETH amount', () => {
      const tokenAmount = parseUnits('10', 18);
      const poolEthReserve = parseUnits('10', 18);
      const poolTokenReserve = parseUnits('20', 18);

      const result = calculateRequiredEthAmount(
        tokenAmount,
        poolEthReserve,
        poolTokenReserve
      );
      const resultEth = parseFloat(formatUnits(result, 18));

      // 10 tokens * (10 ETH / 20 tokens) = 5 ETH
      expect(resultEth).toBe(5);
    });

    it('should return 0 for invalid inputs', () => {
      expect(
        calculateRequiredEthAmount(
          0n,
          parseUnits('10', 18),
          parseUnits('20', 18)
        )
      ).toBe(0n);
      expect(
        calculateRequiredEthAmount(
          parseUnits('10', 18),
          0n,
          parseUnits('20', 18)
        )
      ).toBe(0n);
      expect(
        calculateRequiredEthAmount(
          parseUnits('10', 18),
          parseUnits('10', 18),
          0n
        )
      ).toBe(0n);
    });
  });

  describe('calculateRemoveLiquidityOutput', () => {
    it('should calculate proportional removal amounts', () => {
      const lpTokenAmount = parseUnits('5', 18);
      const poolEthReserve = parseUnits('10', 18);
      const poolTokenReserve = parseUnits('20', 18);
      const totalLPTokens = parseUnits('10', 18);

      const result = calculateRemoveLiquidityOutput(
        lpTokenAmount,
        poolEthReserve,
        poolTokenReserve,
        totalLPTokens
      );

      const ethAmount = parseFloat(formatUnits(result.ethAmount, 18));
      const tokenAmount = parseFloat(formatUnits(result.tokenAmount, 18));

      // 5 LP tokens out of 10 total = 50% of pool
      // 50% of 10 ETH = 5 ETH, 50% of 20 tokens = 10 tokens
      expect(ethAmount).toBe(5);
      expect(tokenAmount).toBe(10);
    });

    it('should return zero amounts for invalid inputs', () => {
      const result = calculateRemoveLiquidityOutput(
        0n,
        parseUnits('10', 18),
        parseUnits('20', 18),
        parseUnits('10', 18)
      );
      expect(result.ethAmount).toBe(0n);
      expect(result.tokenAmount).toBe(0n);
    });

    it('should handle fractional LP tokens', () => {
      const lpTokenAmount = parseUnits('2.5', 18);
      const poolEthReserve = parseUnits('10', 18);
      const poolTokenReserve = parseUnits('30', 18);
      const totalLPTokens = parseUnits('10', 18);

      const result = calculateRemoveLiquidityOutput(
        lpTokenAmount,
        poolEthReserve,
        poolTokenReserve,
        totalLPTokens
      );

      const ethAmount = parseFloat(formatUnits(result.ethAmount, 18));
      const tokenAmount = parseFloat(formatUnits(result.tokenAmount, 18));

      // 2.5 LP tokens out of 10 total = 25% of pool
      expect(ethAmount).toBeCloseTo(2.5, 10);
      expect(tokenAmount).toBeCloseTo(7.5, 10);
    });
  });

  describe('calculateAddLiquidityOutput', () => {
    it('should calculate initial LP tokens using sqrt for empty pool', () => {
      const tokenAmount = parseUnits('4', 18);
      const ethAmount = parseUnits('9', 18);
      const poolEthReserve = 0n;
      const poolTokenReserve = 0n;
      const totalLPTokens = 0n;

      const result = calculateAddLiquidityOutput(
        tokenAmount,
        ethAmount,
        poolEthReserve,
        poolTokenReserve,
        totalLPTokens
      );

      const resultEth = parseFloat(formatUnits(result, 18));

      // sqrt(4 * 9 * 1e36) = sqrt(36 * 1e36) = 6 * 1e18 = 6 ETH worth of LP tokens
      expect(resultEth).toBeCloseTo(6, 10);
    });

    it('should calculate LP tokens using minimum ratio for existing pool', () => {
      const tokenAmount = parseUnits('10', 18);
      const ethAmount = parseUnits('5', 18);
      const poolEthReserve = parseUnits('10', 18);
      const poolTokenReserve = parseUnits('20', 18);
      const totalLPTokens = parseUnits('10', 18);

      const result = calculateAddLiquidityOutput(
        tokenAmount,
        ethAmount,
        poolEthReserve,
        poolTokenReserve,
        totalLPTokens
      );

      const resultEth = parseFloat(formatUnits(result, 18));

      // Token ratio: 10 tokens / 20 pool tokens * 10 total LP = 5 LP tokens
      // ETH ratio: 5 ETH / 10 pool ETH * 10 total LP = 5 LP tokens
      // Min of (5, 5) = 5 LP tokens
      expect(resultEth).toBe(5);
    });
  });

  describe('calculateExchangeRate', () => {
    it('should calculate simple exchange rate', () => {
      const reserveIn = parseUnits('10', 18);
      const reserveOut = parseUnits('20', 18);

      const result = calculateExchangeRate(reserveIn, reserveOut);

      // 20 out / 10 in = 2:1 ratio
      expect(result).toBe(2);
    });

    it('should return 0 for invalid inputs', () => {
      expect(calculateExchangeRate(0n, parseUnits('20', 18))).toBe(0);
      expect(calculateExchangeRate(parseUnits('10', 18), 0n)).toBe(0);
    });

    it('should handle fractional rates', () => {
      const reserveIn = parseUnits('20', 18);
      const reserveOut = parseUnits('10', 18);

      const result = calculateExchangeRate(reserveIn, reserveOut);

      // 10 out / 20 in = 0.5:1 ratio
      expect(result).toBe(0.5);
    });
  });

  describe('Integration scenarios', () => {
    it('should maintain consistency between add/remove liquidity', () => {
      const tokenAmount = parseUnits('20', 18);
      const ethAmount = parseUnits('10', 18);
      const poolEthReserve = parseUnits('100', 18);
      const poolTokenReserve = parseUnits('200', 18);
      const totalLPTokens = parseUnits('100', 18);

      // Add liquidity
      const lpTokensReceived = calculateAddLiquidityOutput(
        tokenAmount,
        ethAmount,
        poolEthReserve,
        poolTokenReserve,
        totalLPTokens
      );

      // Remove the same LP tokens
      const { ethAmount: ethReturned, tokenAmount: tokenReturned } =
        calculateRemoveLiquidityOutput(
          lpTokensReceived,
          poolEthReserve + ethAmount,
          poolTokenReserve + tokenAmount,
          totalLPTokens + lpTokensReceived
        );

      // Should get close to original amounts (some precision loss expected)
      expect(parseFloat(formatUnits(ethReturned, 18))).toBeCloseTo(
        parseFloat(formatUnits(ethAmount, 18)),
        10
      );
      expect(parseFloat(formatUnits(tokenReturned, 18))).toBeCloseTo(
        parseFloat(formatUnits(tokenAmount, 18)),
        10
      );
    });

    it('should handle large swap impact on reserves', () => {
      const amountIn = parseUnits('50', 18); // Large swap
      const reserveIn = parseUnits('100', 18);
      const reserveOut = parseUnits('200', 18);

      const result = calculateSwapOutput(amountIn, reserveIn, reserveOut);

      // Should be less than reserveOut due to slippage
      expect(result).toBeLessThan(reserveOut);
      expect(result).toBeGreaterThan(0n);
    });
  });
});
