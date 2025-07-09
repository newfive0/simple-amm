import { describe, it, expect } from 'vitest';
import { parseUnits } from 'ethers';
import { createRemoveLiquidityOutputCalculator } from './outputDisplayFormatters';

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
});
