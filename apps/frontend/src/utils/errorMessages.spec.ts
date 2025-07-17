import { describe, it, expect } from 'vitest';
import { getFriendlyMessage, ERROR_OPERATIONS } from './errorMessages';

describe('errorMessages', () => {
  describe('getFriendlyMessage', () => {
    describe('Contract custom errors', () => {
      it('should handle InsufficientOutput custom error', () => {
        const error = {
          data: '0xbb2875c3', // InsufficientOutput selector
        };

        const result = getFriendlyMessage(
          ERROR_OPERATIONS.ADD_LIQUIDITY,
          error
        );

        expect(result).toBe(
          'Add liquidity failed: Slippage protection triggered (0.5% tolerance). Try again or reduce trade size.'
        );
      });

      it('should handle unknown custom error', () => {
        const error = {
          data: '0x12345678', // Unknown error selector
        };

        const result = getFriendlyMessage(ERROR_OPERATIONS.SWAP, error);

        expect(result).toBe('Swap failed: {"data":"0x12345678"}');
      });

      it('should handle contract error within ethers CALL_EXCEPTION', () => {
        const error = new Error('execution reverted') as Error & {
          code?: string;
          data?: string;
        };
        error.code = 'CALL_EXCEPTION';
        error.data = '0xbb2875c3'; // InsufficientOutput selector

        const result = getFriendlyMessage(ERROR_OPERATIONS.SWAP, error);

        expect(result).toBe(
          'Swap failed: Slippage protection triggered (0.5% tolerance). Try again or reduce trade size.'
        );
      });
    });

    describe('Standard errors', () => {
      it('should handle Error objects', () => {
        const error = new Error('Transaction failed');

        const result = getFriendlyMessage(ERROR_OPERATIONS.SWAP, error);

        expect(result).toBe('Swap failed: Transaction failed');
      });

      it('should handle pending request errors', () => {
        const error = new Error('Request already pending');

        const result = getFriendlyMessage(
          ERROR_OPERATIONS.WALLET_CONNECTION,
          error
        );

        expect(result).toBe(
          'Wallet connection failed: Please check your wallet and approve the pending request.'
        );
      });

      it('should stringify unknown error types', () => {
        const error = 'Network error occurred';

        const result = getFriendlyMessage(ERROR_OPERATIONS.SWAP, error);

        expect(result).toBe('Swap failed: "Network error occurred"');
      });
    });

    describe('User rejection errors', () => {
      it('should handle MetaMask user rejection with code 4001', () => {
        const error = {
          code: 4001,
          message: 'User rejected the request.',
        };

        const result = getFriendlyMessage(
          ERROR_OPERATIONS.WALLET_CONNECTION,
          error
        );

        expect(result).toBe(
          'Wallet connection cancelled: You rejected the request in your wallet.'
        );
      });

      it('should handle user rejection by message content', () => {
        const error = new Error('User rejected the request');

        const result = getFriendlyMessage(ERROR_OPERATIONS.SWAP, error);

        expect(result).toBe(
          'Swap cancelled: You rejected the request in your wallet.'
        );
      });

      it('should handle user denied message', () => {
        const error = new Error('User denied transaction signature');

        const result = getFriendlyMessage(
          ERROR_OPERATIONS.ADD_LIQUIDITY,
          error
        );

        expect(result).toBe(
          'Add liquidity cancelled: You rejected the request in your wallet.'
        );
      });

      it('should handle user cancelled message', () => {
        const error = new Error('User cancelled the operation');

        const result = getFriendlyMessage(
          ERROR_OPERATIONS.REMOVE_LIQUIDITY,
          error
        );

        expect(result).toBe(
          'Remove liquidity cancelled: You rejected the request in your wallet.'
        );
      });
    });

    describe('Operation types', () => {
      it('should prepend different operation types', () => {
        const error = new Error('Failed');

        expect(getFriendlyMessage(ERROR_OPERATIONS.SWAP, error)).toBe(
          'Swap failed: Failed'
        );
        expect(getFriendlyMessage(ERROR_OPERATIONS.ADD_LIQUIDITY, error)).toBe(
          'Add liquidity failed: Failed'
        );
        expect(
          getFriendlyMessage(ERROR_OPERATIONS.REMOVE_LIQUIDITY, error)
        ).toBe('Remove liquidity failed: Failed');
        expect(
          getFriendlyMessage(ERROR_OPERATIONS.WALLET_CONNECTION, error)
        ).toBe('Wallet connection failed: Failed');
      });
    });
  });
});
