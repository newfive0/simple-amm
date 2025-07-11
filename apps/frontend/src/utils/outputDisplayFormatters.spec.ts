import { describe, it, expect } from 'vitest';
import { parseUnits } from 'ethers';
import {
  createRemoveLiquidityOutputCalculator,
  createReverseSwapCalculator,
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
    it('should calculate Token to ETH swap output correctly', () => {
      const calculator = createSwapOutputCalculator(
        parseUnits('10.0', 18), // poolEthReserve
        parseUnits('20.0', 18), // poolTokenReserve
        'SIMP',
        'ETH'
      );

      // Spend 5 SIMP
      const result = calculator('5.0');
      expect(result).toBe('≈ 1.9952 ETH');
    });

    it('should calculate ETH to Token swap output correctly', () => {
      const calculator = createSwapOutputCalculator(
        parseUnits('10.0', 18), // poolEthReserve
        parseUnits('20.0', 18), // poolTokenReserve
        'ETH',
        'SIMP'
      );

      // Spend 2 ETH
      const result = calculator('2.0');
      expect(result).toBe('≈ 3.3250 SIMP');
    });

    it('should return exchange rate for empty input', () => {
      const calculator = createSwapOutputCalculator(
        parseUnits('10.0', 18), // poolEthReserve
        parseUnits('20.0', 18), // poolTokenReserve
        'SIMP',
        'ETH'
      );

      const result = calculator('');
      expect(result).toBe('1 SIMP ≈ 0.5000 ETH');
    });

    it('should handle zero pool reserves', () => {
      const calculator = createSwapOutputCalculator(
        0n, // poolEthReserve
        0n, // poolTokenReserve
        'SIMP',
        'ETH'
      );

      const result = calculator('5.0');
      expect(result).toBe('≈ 0 ETH');
    });
  });

  describe('createReverseSwapCalculator', () => {
    it('should show "Exceeds available liquidity" when output equals reserve', () => {
      const calculator = createReverseSwapCalculator(
        parseUnits('10.0', 18), // poolEthReserve
        parseUnits('20.0', 18), // poolTokenReserve
        'ETH',
        'SIMP'
      );

      // Try to get exactly 20 SIMP (equals the entire token reserve)
      const result = calculator('20.0');
      expect(result).toBe('Exceeds available liquidity');
    });

    it('should show "Exceeds available liquidity" when output exceeds reserve', () => {
      const calculator = createReverseSwapCalculator(
        parseUnits('10.0', 18), // poolEthReserve
        parseUnits('20.0', 18), // poolTokenReserve
        'ETH',
        'SIMP'
      );

      // Try to get more than available SIMP reserve
      const result = calculator('25.0');
      expect(result).toBe('Exceeds available liquidity');
    });

    it('should calculate valid swap when output is within reserves', () => {
      const calculator = createReverseSwapCalculator(
        parseUnits('10.0', 18), // poolEthReserve
        parseUnits('20.0', 18), // poolTokenReserve
        'ETH',
        'SIMP'
      );

      // Want 2 SIMP - should calculate required ETH
      const result = calculator('2.0');
      expect(result).toMatch(/≈ \d+\.\d{4} ETH/);
      expect(result).not.toBe('Exceeds available liquidity');
    });

    it('should handle token-to-eth direction correctly', () => {
      const calculator = createReverseSwapCalculator(
        parseUnits('10.0', 18), // poolEthReserve
        parseUnits('20.0', 18), // poolTokenReserve
        'SIMP',
        'ETH'
      );

      // Try to get exactly 10 ETH (equals the entire ETH reserve)
      const result = calculator('10.0');
      expect(result).toBe('Exceeds available liquidity');
    });
  });
});
