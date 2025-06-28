// Utility for handling wallet error messages with user-friendly formatting

// Error message constants
export const WALLET_REQUIRED_ERROR =
  'Ethereum wallet required. Please install a Web3 wallet extension.';

/**
 * Formats wallet error messages with user-friendly text and refresh instruction
 * @param error - The error object or message
 * @returns Formatted error message with appropriate user guidance
 */
export const getFriendlyMessage = (error: unknown): string => {
  const baseMessage = extractErrorMessage(error);

  // Handle specific error cases for pending requests
  // Check for "already pending" messages (can come as Error objects or RPC errors)
  const lowerMessage = baseMessage.toLowerCase();
  if (
    lowerMessage.includes('already pending') ||
    lowerMessage.includes('request already pending') ||
    lowerMessage.includes('permissions request already pending')
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
