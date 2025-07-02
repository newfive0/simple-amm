// Utility for handling error messages with user-friendly formatting
import { isError } from 'ethers';

// Error message constants
export const WALLET_REQUIRED_ERROR =
  'Ethereum wallet required. Please install a Web3 wallet extension.';

// Operation constants for error messages
export const ERROR_OPERATIONS = {
  SWAP: 'Swap',
  ADD_LIQUIDITY: 'Add liquidity',
  REMOVE_LIQUIDITY: 'Remove liquidity',
  WALLET_CONNECTION: 'Wallet connection',
} as const;

export type ErrorOperation =
  (typeof ERROR_OPERATIONS)[keyof typeof ERROR_OPERATIONS];

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
  // Check for "already pending" messages (can come as Error objects or RPC errors)
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

  // Always prepend operation with "failed:"
  return `${operation} failed: ${baseMessage}`;
};

/**
 * Extracts error message from various error formats
 */
const extractErrorMessage = (error: unknown): string => {
  // Handle ethers errors
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
 * Common ethers error codes we want to handle
 */
const ETHERS_ERROR_CODES = [
  'ACTION_REJECTED',
  'CALL_EXCEPTION',
  'TRANSACTION_REPLACED',
  'INSUFFICIENT_FUNDS',
] as const;

/**
 * Helper function to extract message from ethers errors
 */
const getEthersErrorMessage = (error: {
  shortMessage?: string;
  message: string;
}): string => {
  if (error.shortMessage) {
    return error.shortMessage;
  }
  return error.message;
};
