/**
 * Common mock utilities and test helpers for testing
 */
import { vi } from 'vitest';
import { Token, AMMPool } from '@typechain-types';

/**
 * Creates a deferred promise that can be resolved externally
 * @returns Object with promise and resolve function
 */
export function createDeferredPromise<T = void>() {
  let resolvePromise: (value: T) => void;
  const promise = new Promise<T>((resolve) => {
    resolvePromise = resolve;
  });
  return { promise, resolve: resolvePromise! };
}

/**
 * Creates a deferred promise for contract transactions with wait() method
 * @returns Object with promise and resolve function for transaction-like objects
 */
export function createDeferredTransactionPromise() {
  let resolvePromise: () => void;
  const promise = new Promise<{ wait: () => Promise<unknown> }>((resolve) => {
    resolvePromise = () => resolve({ wait: vi.fn().mockResolvedValue({}) });
  });
  return { promise, resolve: resolvePromise! };
}

// Create mock contract instances
export const createMockTokenContract = () => ({
  approve: vi.fn(),
  symbol: vi.fn(),
  balanceOf: vi.fn(),
  getAddress: vi.fn().mockResolvedValue(mockContractAddresses.tokenAddress),
});

export const createMockAMMContract = () => ({
  swap: vi.fn(),
  addLiquidity: vi.fn(),
  removeLiquidity: vi.fn(),
  reserveETH: vi.fn(),
  reserveSimplest: vi.fn(),
  getAddress: vi.fn().mockResolvedValue(mockContractAddresses.ammPoolAddress),
  // New view functions for slippage protection
  getSwapOutput: vi.fn().mockResolvedValue(BigInt(1e18)), // 1 ETH in wei
  getLiquidityOutput: vi.fn().mockResolvedValue(BigInt(1e18)), // 1 LP token in wei
  getRemoveLiquidityOutput: vi.fn().mockResolvedValue([
    BigInt(1e18), // 1 token in wei
    BigInt(1e18), // 1 ETH in wei
  ]),
});

// Type-safe mock contract factories
export const createMockContracts = () => {
  const mockTokenContract = createMockTokenContract();
  const mockAmmContract = createMockAMMContract();

  return {
    tokenContract: mockTokenContract as unknown as Token,
    ammContract: mockAmmContract as unknown as AMMPool,
    mockTokenContract,
    mockAmmContract,
  };
};

// Common contract addresses
export const mockContractAddresses = {
  tokenAddress: '0x123',
  ammPoolAddress: '0x456',
};

// Common test props
export const createDefaultProps = (
  overrides: { [key: string]: unknown } = {}
) => {
  const { tokenContract, ammContract } = createMockContracts();

  return {
    tokenContract,
    ammContract,
    poolEthReserve: BigInt(10 * 1e18), // 10 ETH in wei
    poolTokenReserve: BigInt(20 * 1e18), // 20 tokens in wei
    ...overrides,
  };
};
