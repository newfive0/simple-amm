import { describe, it, expect } from 'vitest';
import {
  calculateMinAmountWithSlippage,
  DEFAULT_SLIPPAGE_TOLERANCE,
} from './slippageProtection';

describe('slippageProtection', () => {
  describe('calculateMinAmountWithSlippage', () => {
    it('should apply default 0.5% slippage tolerance', () => {
      const expectedAmount = BigInt('1000000000000000000'); // 1 ETH
      const result = calculateMinAmountWithSlippage(expectedAmount);

      // 0.5% slippage = 99.5% of original = 995000000000000000
      expect(result).toBe(BigInt('995000000000000000'));
    });

    it('should apply custom slippage tolerance', () => {
      const expectedAmount = BigInt('1000000000000000000'); // 1 ETH
      const slippageTolerance = 1.0; // 1%
      const result = calculateMinAmountWithSlippage(
        expectedAmount,
        slippageTolerance
      );

      // 1% slippage = 99% of original = 990000000000000000
      expect(result).toBe(BigInt('990000000000000000'));
    });

    it('should handle 5% slippage tolerance', () => {
      const expectedAmount = BigInt('1000000000000000000'); // 1 ETH
      const slippageTolerance = 5.0; // 5%
      const result = calculateMinAmountWithSlippage(
        expectedAmount,
        slippageTolerance
      );

      // 5% slippage = 95% of original = 950000000000000000
      expect(result).toBe(BigInt('950000000000000000'));
    });

    it('should handle small amounts', () => {
      const expectedAmount = BigInt('1000'); // Very small amount
      const result = calculateMinAmountWithSlippage(expectedAmount);

      // 0.5% slippage = 99.5% of original = 995
      expect(result).toBe(BigInt('995'));
    });

    it('should handle zero amount', () => {
      const expectedAmount = BigInt('0');
      const result = calculateMinAmountWithSlippage(expectedAmount);

      expect(result).toBe(BigInt('0'));
    });

    it('should use default slippage tolerance when not provided', () => {
      const expectedAmount = BigInt('2000000000000000000'); // 2 ETH
      const result = calculateMinAmountWithSlippage(expectedAmount);

      // Should use DEFAULT_SLIPPAGE_TOLERANCE (0.5%)
      const expected = (expectedAmount * BigInt(9950)) / BigInt(10000);
      expect(result).toBe(expected);
    });

    it('should handle fractional percentage calculations correctly', () => {
      const expectedAmount = BigInt('100000000000000000000'); // 100 ETH
      const slippageTolerance = 0.1; // 0.1%
      const result = calculateMinAmountWithSlippage(
        expectedAmount,
        slippageTolerance
      );

      // 0.1% slippage = 99.9% of original
      const expected = (expectedAmount * BigInt(9990)) / BigInt(10000);
      expect(result).toBe(expected);
    });
  });

  describe('DEFAULT_SLIPPAGE_TOLERANCE', () => {
    it('should be set to 0.5%', () => {
      expect(DEFAULT_SLIPPAGE_TOLERANCE).toBe(0.5);
    });
  });
});