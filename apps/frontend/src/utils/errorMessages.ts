// Utility for handling error messages with user-friendly formatting
import { isError } from 'ethers';
import { AMMPool__factory } from '@typechain-types';

// Error message constants
export const WALLET_REQUIRED_ERROR =
  'Ethereum wallet required. Please install a Web3 wallet extension.';

// Operation constants for error messages
export const ERROR_OPERATIONS = {
  SWAP: 'Swap',
  ADD_LIQUIDITY: 'Add liquidity',
  REMOVE_LIQUIDITY: 'Remove liquidity',
  WALLET_CONNECTION: 'Wallet connection',
  BALANCE_FETCH: 'Balance fetch',
} as const;

export type ErrorOperation =
  (typeof ERROR_OPERATIONS)[keyof typeof ERROR_OPERATIONS];

/**
 * Common ethers error codes we want to handle
 */
const ETHERS_ERROR_CODES = [
  'ACTION_REJECTED',
  'CALL_EXCEPTION',
  'TRANSACTION_REPLACED',
  'INSUFFICIENT_FUNDS',
] as const;

/**
 * Gets a user-friendly message for contract custom errors
 * @param errorName - The name of the custom error
 * @returns User-friendly error message
 */
const getCustomErrorMessage = (errorName: string): string => {
  switch (errorName) {
    case 'InsufficientOutput':
      return 'Slippage protection triggered (0.5% tolerance). Try again or reduce trade size.';
    case 'InsufficientLiquidity':
      return 'Not enough liquidity in the pool for this trade.';
    case 'InvalidAmount':
      return 'Invalid amount provided.';
    case 'UnsupportedToken':
      return 'Unsupported token.';
    case 'InsufficientETHReserve':
      return 'Insufficient ETH reserves in the pool.';
    case 'InsufficientTokenReserve':
      return 'Insufficient token reserves in the pool.';
    default:
      return `Contract error: ${errorName}`;
  }
};

/**
 * Checks if an error is a contract custom error by attempting to decode it
 * @param error - The error object to check
 * @returns The decoded error name if it's a custom contract error, empty string otherwise
 */
const getContractCustomError = (error: unknown): string => {
  // Helper function to try decoding error data
  const tryParseError = (data: string): string => {
    if (typeof data === 'string' && data.length >= 10) {
      try {
        const ammInterface = AMMPool__factory.createInterface();
        const decodedError = ammInterface.parseError(data);
        return decodedError?.name || '';
      } catch {
        return '';
      }
    }
    return '';
  };

  if (typeof error === 'object' && error !== null) {
    const errorObj = error as { data?: string };

    // Check direct error.data (most common location for ethers v6 CALL_EXCEPTION)
    if (errorObj.data) {
      const result = tryParseError(errorObj.data);
      if (result) return result;
    }
  }

  return '';
};

/**
 * Helper function to extract message from ethers errors
 */
const getEthersErrorMessage = (error: unknown): string => {
  // First check if this ethers error contains custom contract error data
  const customErrorName = getContractCustomError(error);
  if (customErrorName) {
    return getCustomErrorMessage(customErrorName);
  }

  if (error && typeof error === 'object') {
    const errorObj = error as { shortMessage?: string; message?: string };
    if (errorObj.shortMessage) {
      return errorObj.shortMessage;
    }
    if (errorObj.message) {
      return errorObj.message;
    }
  }
  return 'Unknown error';
};

/**
 * Extracts error message from various error formats
 */
const extractErrorMessage = (error: unknown): string => {
  // First check for contract custom errors
  const customErrorName = getContractCustomError(error);
  if (customErrorName) {
    return getCustomErrorMessage(customErrorName);
  }

  // Handle ethers errors - but also check for custom errors within them
  for (const code of ETHERS_ERROR_CODES) {
    if (isError(error, code)) {
      return getEthersErrorMessage(error);
    }
  }

  // Handle other Error objects
  if (error instanceof Error) {
    return error.message;
  }

  // Fallback - stringify everything else
  return JSON.stringify(error);
};

/**
 * Formats error messages with user-friendly text and operation context
 * @param operation - The operation that failed (required)
 * @param error - The error object or message
 * @returns Formatted error message with operation prepended
 */
export const getFriendlyMessage = (
  operation: ErrorOperation,
  error: unknown
): string => {
  let baseMessage = extractErrorMessage(error);

  // Handle specific error cases for pending requests
  if (baseMessage && typeof baseMessage === 'string') {
    const lowerMessage = baseMessage.toLowerCase();
    if (
      lowerMessage.includes('already pending') ||
      lowerMessage.includes('request already pending') ||
      lowerMessage.includes('permissions request already pending')
    ) {
      baseMessage = 'Please check your wallet and approve the pending request.';
    }
  }

  return `${operation} failed: ${baseMessage}`;
};
