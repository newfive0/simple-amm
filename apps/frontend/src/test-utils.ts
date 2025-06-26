/**
 * Test utilities for creating deferred promises and other common test helpers
 */
import { vi } from 'vitest';

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