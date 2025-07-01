import { describe, it, expect } from 'vitest';
import {
  createRemoveLiquidityOutputCalculator,
  createSwapOutputCalculator,
} from './expectedOutputCalculators';

describe('expectedOutputCalculators', () => {
  describe('createRemoveLiquidityOutputCalculator', () => {
    it('should calculate correct output for valid inputs', () => {
      const calculator = createRemoveLiquidityOutputCalculator(
        10.0, // poolEthReserve
        20.0, // poolTokenReserve
        5.0, // totalLPTokens
        'SIMP'
      );

      const result = calculator('2.5');
      expect(result).toBe('10.0000 SIMP + 5.0000 ETH');
    });

    it('should return zero output for empty input', () => {
      const calculator = createRemoveLiquidityOutputCalculator(
        10.0,
        20.0,
        5.0,
        'SIMP'
      );

      expect(calculator('')).toBe('0.0000 SIMP + 0.0000 ETH');
      expect(calculator('0')).toBe('0.0000 SIMP + 0.0000 ETH');
    });

    it('should return zero output when total LP tokens is zero', () => {
      const calculator = createRemoveLiquidityOutputCalculator(
        10.0,
        20.0,
        0, // totalLPTokens = 0
        'SIMP'
      );

      const result = calculator('2.5');
      expect(result).toBe('0.0000 SIMP + 0.0000 ETH');
    });
  });

  describe('createSwapOutputCalculator', () => {
    it('should calculate correct output for token to ETH swap', () => {
      const calculator = createSwapOutputCalculator(
        10.0, // poolEthReserve
        20.0, // poolTokenReserve
        'SIMP', // inputToken
        'ETH' // outputToken
      );

      const result = calculator('5');
      // Expected: (10 * 5) / (20 + 5) = 2.000000
      expect(result).toBe('≈ 2.000000 ETH');
    });

    it('should calculate correct output for ETH to token swap', () => {
      const calculator = createSwapOutputCalculator(
        10.0, // poolEthReserve
        20.0, // poolTokenReserve
        'ETH', // inputToken
        'SIMP' // outputToken
      );

      const result = calculator('2');
      // Expected: (20 * 2) / (10 + 2) = 3.333333
      expect(result).toBe('≈ 3.333333 SIMP');
    });

    it('should return exchange rate for empty input in token to ETH direction', () => {
      const calculator = createSwapOutputCalculator(
        10.0,
        20.0,
        'SIMP', // inputToken
        'ETH' // outputToken
      );

      expect(calculator('')).toBe('1 SIMP ≈ 0.500000 ETH');
      expect(calculator('0')).toBe('1 SIMP ≈ 0.500000 ETH');
    });

    it('should return exchange rate for empty input in ETH to token direction', () => {
      const calculator = createSwapOutputCalculator(
        10.0,
        20.0,
        'ETH', // inputToken
        'SIMP' // outputToken
      );

      expect(calculator('')).toBe('1 ETH ≈ 2.0000 SIMP');
      expect(calculator('0')).toBe('1 ETH ≈ 2.0000 SIMP');
    });

    it('should return fallback when pool reserves are zero', () => {
      const calculator = createSwapOutputCalculator(
        0, // poolEthReserve = 0
        0, // poolTokenReserve = 0
        'SIMP', // inputToken
        'ETH' // outputToken
      );

      const result = calculator('5');
      expect(result).toBe('≈ 0 ETH');
    });
  });
});
