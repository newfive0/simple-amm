// Utility for handling wallet error messages with user-friendly formatting

// Error message constants
export const WALLET_REQUIRED_ERROR =
  'Ethereum wallet required. Please install a Web3 wallet extension.';

// Known wallet error codes
const WALLET_ERROR_CODES = {
  RESOURCE_UNAVAILABLE: -32002, // Resource unavailable (e.g., request already pending)
  USER_REJECTED: 4001, // User rejected the request
  UNAUTHORIZED: 4100, // The requested account is not exposed
  UNSUPPORTED_METHOD: 4200, // The requested method is not supported
  DISCONNECTED: 4900, // The provider is disconnected from all chains
  CHAIN_DISCONNECTED: 4901, // The provider is disconnected from the specified chain
} as const;

/**
 * Formats wallet error messages with user-friendly text and refresh instruction
 * @param error - The error object or message
 * @returns Formatted error message with appropriate user guidance
 */
export const getFriendlyMessage = (error: unknown): string => {
  const baseMessage = extractErrorMessage(error);
  const errorCode = extractErrorCode(error);

  // Handle specific error cases
  if (
    errorCode === WALLET_ERROR_CODES.RESOURCE_UNAVAILABLE &&
    baseMessage.includes('already pending')
  ) {
    return 'Please check your wallet and approve the pending request.';
  }

  // Default case: append refresh instruction
  return `${baseMessage} Please refresh and retry.`;
};

/**
 * Extracts error message from various error formats
 */
const extractErrorMessage = (error: unknown): string => {
  // Handle Error objects
  if (error instanceof Error) {
    return error.message;
  }

  // Handle objects with message property
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message: unknown }).message;
    return message === null ? 'Unknown error.' : String(message);
  }

  // Handle string errors
  if (typeof error === 'string') {
    return error;
  }

  // Fallback
  return 'Unknown error.';
};

/**
 * Extracts error code from error object
 */
const extractErrorCode = (error: unknown): number | null => {
  // Handle objects with code property
  if (error && typeof error === 'object' && 'code' in error) {
    const code = (error as { code: unknown }).code;
    return typeof code === 'number' ? code : null;
  }

  return null;
};
