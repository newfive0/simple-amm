import { describe, it, expect } from 'vitest';
import { getFriendlyMessage } from './errorMessages';

describe('errorMessages', () => {
  describe('getFriendlyMessage', () => {
    describe('Resource unavailable with pending request', () => {
      it('should return wallet check message for -32002 error with "already pending" text', () => {
        const error = {
          code: -32002,
          message: 'Request of type wallet_requestPermissions already pending',
        };

        const result = getFriendlyMessage(error);

        expect(result).toBe(
          'Please check your wallet and approve the pending request.'
        );
      });

      it('should return wallet check message for error message containing "already pending"', () => {
        const error = new Error(
          'MetaMask - RPC Error: Request already pending for origin'
        );

        const result = getFriendlyMessage(error);

        expect(result).toBe(
          'Please check your wallet and approve the pending request.'
        );
      });

      it('should require both -32002 code AND "already pending" text', () => {
        const error = {
          code: -32002,
          message: 'Some other resource unavailable error',
        };

        const result = getFriendlyMessage(error);

        expect(result).toBe(
          'Some other resource unavailable error Please refresh and retry.'
        );
      });
    });

    describe('Other error types', () => {
      it('should handle user rejection errors', () => {
        const error = {
          code: 4001,
          message: 'User rejected the request',
        };

        const result = getFriendlyMessage(error);

        expect(result).toBe(
          'User rejected the request Please refresh and retry.'
        );
      });

      it('should handle Error objects', () => {
        const error = new Error('Connection timeout');

        const result = getFriendlyMessage(error);

        expect(result).toBe('Connection timeout Please refresh and retry.');
      });

      it('should handle string errors', () => {
        const error = 'Network error occurred';

        const result = getFriendlyMessage(error);

        expect(result).toBe('Network error occurred Please refresh and retry.');
      });

      it('should handle objects with message property', () => {
        const error = {
          message: 'Invalid chain ID',
          data: { chainId: '0x1' },
        };

        const result = getFriendlyMessage(error);

        expect(result).toBe('Invalid chain ID Please refresh and retry.');
      });

      it('should handle unknown error formats', () => {
        const error = null;

        const result = getFriendlyMessage(error);

        expect(result).toBe('Unknown error. Please refresh and retry.');
      });

      it('should handle undefined errors', () => {
        const error = undefined;

        const result = getFriendlyMessage(error);

        expect(result).toBe('Unknown error. Please refresh and retry.');
      });

      it('should handle objects without message property', () => {
        const error = { data: 'some data', status: 500 };

        const result = getFriendlyMessage(error);

        expect(result).toBe('Unknown error. Please refresh and retry.');
      });
    });

    describe('Error code extraction', () => {
      it('should handle numeric error codes', () => {
        const error = {
          code: 4100,
          message: 'Unauthorized',
        };

        const result = getFriendlyMessage(error);

        expect(result).toBe('Unauthorized Please refresh and retry.');
      });

      it('should handle string error codes', () => {
        const error = {
          code: 'NETWORK_ERROR',
          message: 'Network is down',
        };

        const result = getFriendlyMessage(error);

        expect(result).toBe('Network is down Please refresh and retry.');
      });

      it('should handle missing error codes', () => {
        const error = {
          message: 'Error without code',
        };

        const result = getFriendlyMessage(error);

        expect(result).toBe('Error without code Please refresh and retry.');
      });
    });

    describe('Message extraction edge cases', () => {
      it('should handle non-string message property', () => {
        const error = {
          message: 123,
        };

        const result = getFriendlyMessage(error);

        expect(result).toBe('123 Please refresh and retry.');
      });

      it('should handle null message property', () => {
        const error = {
          message: null,
        };

        const result = getFriendlyMessage(error);

        expect(result).toBe('Unknown error. Please refresh and retry.');
      });

      it('should handle boolean values', () => {
        const error = true;

        const result = getFriendlyMessage(error);

        expect(result).toBe('Unknown error. Please refresh and retry.');
      });

      it('should handle number values', () => {
        const error = 404;

        const result = getFriendlyMessage(error);

        expect(result).toBe('Unknown error. Please refresh and retry.');
      });
    });

    describe('Real-world error scenarios', () => {
      it('should handle MetaMask resource unavailable error', () => {
        const error = {
          code: -32002,
          message:
            "Request of type 'wallet_requestPermissions' already pending for origin http://localhost:3000. Please wait.",
        };

        const result = getFriendlyMessage(error);

        expect(result).toBe(
          'Please check your wallet and approve the pending request.'
        );
      });

      it('should handle MetaMask user rejection', () => {
        const error = {
          code: 4001,
          message: 'MetaMask Tx Signature: User denied transaction signature.',
        };

        const result = getFriendlyMessage(error);

        expect(result).toBe(
          'MetaMask Tx Signature: User denied transaction signature. Please refresh and retry.'
        );
      });

      it('should handle network connection errors', () => {
        const error = new Error('Failed to fetch');

        const result = getFriendlyMessage(error);

        expect(result).toBe('Failed to fetch Please refresh and retry.');
      });

      it('should handle RPC errors', () => {
        const error = {
          code: -32603,
          message: 'Internal JSON-RPC error',
        };

        const result = getFriendlyMessage(error);

        expect(result).toBe(
          'Internal JSON-RPC error Please refresh and retry.'
        );
      });
    });
  });
});
