import { describe, it, expect } from 'vitest';
import { parseUnits } from 'ethers';
import {
  createRemoveLiquidityOutputCalculator,
  createSwapOutputCalculator,
} from './outputDisplayFormatters';

describe('outputDisplayFormatters', () => {
  describe('createRemoveLiquidityOutputCalculator', () => {
    it('should calculate correct output for valid inputs', () => {
      const calculator = createRemoveLiquidityOutputCalculator(
        parseUnits('10.0', 18), // poolEthReserve
        parseUnits('20.0', 18), // poolTokenReserve
        parseUnits('5.0', 18) // totalLPTokens
      );

      const result = calculator('2.5');
      expect(result).toBe('10.0000 SIMP + 5.0000 ETH');
    });

    it('should return zero output for empty input', () => {
      const calculator = createRemoveLiquidityOutputCalculator(
        parseUnits('10.0', 18),
        parseUnits('20.0', 18),
        parseUnits('5.0', 18)
      );

      expect(calculator('')).toBe('0.0000 SIMP + 0.0000 ETH');
      expect(calculator('0')).toBe('0.0000 SIMP + 0.0000 ETH');
    });

    it('should return zero output when total LP tokens is zero', () => {
      const calculator = createRemoveLiquidityOutputCalculator(
        parseUnits('10.0', 18),
        parseUnits('20.0', 18),
        0n // totalLPTokens = 0
      );

      const result = calculator('2.5');
      expect(result).toBe('0.0000 SIMP + 0.0000 ETH');
    });
  });

  describe('createSwapOutputCalculator', () => {
    it('should calculate correct output for token to ETH swap', () => {
      const calculator = createSwapOutputCalculator(
        parseUnits('10.0', 18), // poolEthReserve
        parseUnits('20.0', 18), // poolTokenReserve
        'SIMP', // inputToken
        'ETH' // outputToken
      );

      const result = calculator('5');
      // Expected: with 0.3% fee, should be close to 1.995 ETH
      expect(result).toMatch(/≈ 1\.995.* ETH/);
    });

    it('should calculate correct output for ETH to token swap', () => {
      const calculator = createSwapOutputCalculator(
        parseUnits('10.0', 18), // poolEthReserve
        parseUnits('20.0', 18), // poolTokenReserve
        'ETH', // inputToken
        'SIMP' // outputToken
      );

      const result = calculator('2');
      // Expected: with 0.3% fee, should be close to 3.325 SIMP
      expect(result).toMatch(/≈ 3\.32.* SIMP/);
    });

    it('should return exchange rate for empty input in token to ETH direction', () => {
      const calculator = createSwapOutputCalculator(
        parseUnits('10.0', 18),
        parseUnits('20.0', 18),
        'SIMP', // inputToken
        'ETH' // outputToken
      );

      expect(calculator('')).toBe('1 SIMP ≈ 0.5000 ETH');
      expect(calculator('0')).toBe('1 SIMP ≈ 0.5000 ETH');
    });

    it('should return exchange rate for empty input in ETH to token direction', () => {
      const calculator = createSwapOutputCalculator(
        parseUnits('10.0', 18),
        parseUnits('20.0', 18),
        'ETH', // inputToken
        'SIMP' // outputToken
      );

      expect(calculator('')).toBe('1 ETH ≈ 2.0000 SIMP');
      expect(calculator('0')).toBe('1 ETH ≈ 2.0000 SIMP');
    });

    it('should return fallback when pool reserves are zero', () => {
      const calculator = createSwapOutputCalculator(
        0n, // poolEthReserve = 0
        0n, // poolTokenReserve = 0
        'SIMP', // inputToken
        'ETH' // outputToken
      );

      const result = calculator('5');
      expect(result).toBe('≈ 0 ETH');
    });
  });
});
