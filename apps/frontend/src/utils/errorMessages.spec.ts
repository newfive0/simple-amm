import { describe, it, expect } from 'vitest';
import { getFriendlyMessage, ERROR_OPERATIONS } from './errorMessages';

describe('errorMessages', () => {
  describe('getFriendlyMessage', () => {
    describe('Ethers errors', () => {
      it('should handle ethers ACTION_REJECTED error with shortMessage', () => {
        const error = new Error('user rejected action') as Error & {
          code?: string;
          shortMessage?: string;
        };
        error.code = 'ACTION_REJECTED';
        error.shortMessage = 'User denied transaction';

        const result = getFriendlyMessage(ERROR_OPERATIONS.SWAP, error);

        expect(result).toBe('Swap failed: User denied transaction');
      });

      it('should handle ethers ACTION_REJECTED error without shortMessage', () => {
        const error = new Error('user rejected action') as Error & {
          code?: string;
          shortMessage?: string;
        };
        error.code = 'ACTION_REJECTED';

        const result = getFriendlyMessage(ERROR_OPERATIONS.SWAP, error);

        expect(result).toBe('Swap failed: user rejected action');
      });

      it('should handle ethers CALL_EXCEPTION error', () => {
        const error = new Error('execution reverted') as Error & {
          code?: string;
          shortMessage?: string;
        };
        error.code = 'CALL_EXCEPTION';
        error.shortMessage = 'Insufficient balance';

        const result = getFriendlyMessage(ERROR_OPERATIONS.SWAP, error);

        expect(result).toBe('Swap failed: Insufficient balance');
      });

      it('should handle ethers TRANSACTION_REPLACED error', () => {
        const error = new Error('transaction replaced') as Error & {
          code?: string;
          shortMessage?: string;
        };
        error.code = 'TRANSACTION_REPLACED';
        error.shortMessage = 'Transaction was replaced';

        const result = getFriendlyMessage(ERROR_OPERATIONS.SWAP, error);

        expect(result).toBe('Swap failed: Transaction was replaced');
      });

      it('should handle ethers INSUFFICIENT_FUNDS error', () => {
        const error = new Error('insufficient funds') as Error & {
          code?: string;
          shortMessage?: string;
        };
        error.code = 'INSUFFICIENT_FUNDS';
        error.shortMessage = 'Not enough ETH for gas';

        const result = getFriendlyMessage(ERROR_OPERATIONS.SWAP, error);

        expect(result).toBe('Swap failed: Not enough ETH for gas');
      });
    });

    describe('Standard Error objects', () => {
      it('should handle Error objects', () => {
        const error = new Error('Connection timeout');

        const result = getFriendlyMessage(ERROR_OPERATIONS.SWAP, error);

        expect(result).toBe('Swap failed: Connection timeout');
      });

      it('should handle Error with empty message', () => {
        const error = new Error('');

        const result = getFriendlyMessage(ERROR_OPERATIONS.SWAP, error);

        expect(result).toBe('Swap failed: ');
      });
    });

    describe('Pending request handling', () => {
      it('should transform "already pending" errors', () => {
        const error = new Error(
          'Request of type wallet_requestPermissions already pending'
        );

        const result = getFriendlyMessage(
          ERROR_OPERATIONS.WALLET_CONNECTION,
          error
        );

        expect(result).toBe(
          'Wallet connection failed: Please check your wallet and approve the pending request.'
        );
      });

      it('should transform "request already pending" errors', () => {
        const error = new Error(
          'MetaMask - RPC Error: Request already pending for origin'
        );

        const result = getFriendlyMessage(ERROR_OPERATIONS.SWAP, error);

        expect(result).toBe(
          'Swap failed: Please check your wallet and approve the pending request.'
        );
      });

      it('should transform "permissions request already pending" errors', () => {
        const error = new Error('Permissions request already pending');

        const result = getFriendlyMessage(
          ERROR_OPERATIONS.ADD_LIQUIDITY,
          error
        );

        expect(result).toBe(
          'Add liquidity failed: Please check your wallet and approve the pending request.'
        );
      });

      it('should handle case-insensitive pending messages', () => {
        const error = new Error('REQUEST ALREADY PENDING');

        const result = getFriendlyMessage(ERROR_OPERATIONS.SWAP, error);

        expect(result).toBe(
          'Swap failed: Please check your wallet and approve the pending request.'
        );
      });
    });

    describe('JSON stringified fallback', () => {
      it('should stringify string errors', () => {
        const error = 'Network error occurred';

        const result = getFriendlyMessage(ERROR_OPERATIONS.SWAP, error);

        expect(result).toBe('Swap failed: "Network error occurred"');
      });

      it('should stringify objects with message property', () => {
        const error = {
          code: 4001,
          message: 'User rejected the request',
        };

        const result = getFriendlyMessage(ERROR_OPERATIONS.SWAP, error);

        expect(result).toBe(
          'Swap failed: {"code":4001,"message":"User rejected the request"}'
        );
      });

      it('should stringify objects without message property', () => {
        const error = { data: 'some data', status: 500 };

        const result = getFriendlyMessage(ERROR_OPERATIONS.SWAP, error);

        expect(result).toBe('Swap failed: {"data":"some data","status":500}');
      });

      it('should stringify null', () => {
        const error = null;

        const result = getFriendlyMessage(ERROR_OPERATIONS.SWAP, error);

        expect(result).toBe('Swap failed: null');
      });

      it('should stringify undefined', () => {
        const error = undefined;

        const result = getFriendlyMessage(ERROR_OPERATIONS.SWAP, error);

        expect(result).toBe('Swap failed: undefined');
      });

      it('should stringify boolean values', () => {
        const error = true;

        const result = getFriendlyMessage(ERROR_OPERATIONS.SWAP, error);

        expect(result).toBe('Swap failed: true');
      });

      it('should stringify number values', () => {
        const error = 404;

        const result = getFriendlyMessage(ERROR_OPERATIONS.SWAP, error);

        expect(result).toBe('Swap failed: 404');
      });

      it('should stringify arrays', () => {
        const error = ['error1', 'error2'];

        const result = getFriendlyMessage(ERROR_OPERATIONS.SWAP, error);

        expect(result).toBe('Swap failed: ["error1","error2"]');
      });
    });

    describe('Different operations', () => {
      it('should prepend SWAP operation', () => {
        const error = new Error('Transaction failed');

        const result = getFriendlyMessage(ERROR_OPERATIONS.SWAP, error);

        expect(result).toBe('Swap failed: Transaction failed');
      });

      it('should prepend ADD_LIQUIDITY operation', () => {
        const error = new Error('Transaction failed');

        const result = getFriendlyMessage(
          ERROR_OPERATIONS.ADD_LIQUIDITY,
          error
        );

        expect(result).toBe('Add liquidity failed: Transaction failed');
      });

      it('should prepend REMOVE_LIQUIDITY operation', () => {
        const error = new Error('Transaction failed');

        const result = getFriendlyMessage(
          ERROR_OPERATIONS.REMOVE_LIQUIDITY,
          error
        );

        expect(result).toBe('Remove liquidity failed: Transaction failed');
      });

      it('should prepend WALLET_CONNECTION operation', () => {
        const error = new Error('Connection failed');

        const result = getFriendlyMessage(
          ERROR_OPERATIONS.WALLET_CONNECTION,
          error
        );

        expect(result).toBe('Wallet connection failed: Connection failed');
      });
    });

    describe('Complex error scenarios', () => {
      it('should handle nested error objects', () => {
        const error = {
          code: -32002,
          message: 'Resource unavailable',
          data: {
            originalError: {
              code: 4001,
              message: 'User rejected',
            },
          },
        };

        const result = getFriendlyMessage(ERROR_OPERATIONS.SWAP, error);

        expect(result).toBe(
          'Swap failed: {"code":-32002,"message":"Resource unavailable","data":{"originalError":{"code":4001,"message":"User rejected"}}}'
        );
      });

      it('should handle Error with custom properties', () => {
        const error = new Error('Base error') as Error & {
          customProp?: string;
          code?: string;
        };
        error.customProp = 'custom value';
        error.code = 'CUSTOM_CODE';

        const result = getFriendlyMessage(ERROR_OPERATIONS.SWAP, error);

        // Regular Error objects just return their message
        expect(result).toBe('Swap failed: Base error');
      });

      it('should handle empty objects', () => {
        const error = {};

        const result = getFriendlyMessage(ERROR_OPERATIONS.SWAP, error);

        expect(result).toBe('Swap failed: {}');
      });
    });
  });
});
