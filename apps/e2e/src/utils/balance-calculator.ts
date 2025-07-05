/**
 * Utility functions for calculating expected balances in AMM functionality tests
 * Uses integer arithmetic to match smart contract precision exactly
 */

import { ethers } from 'ethers';

export interface BalanceState {
  ethBalance: number;
  simpBalance: number;
}

export interface PoolReserves {
  ethReserve: number;
  simpReserve: number;
}

// Constants
const INITIAL_SIMP = 1000000;
const TEST_WALLET_ADDRESS = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'; // Hardhat default account 0

// Scale factor for integer arithmetic (18 decimal places to match ETH precision)
const SCALE = 10n ** 18n;

// Internal state
let currentBalances: BalanceState = {
  ethBalance: 0, // Will be initialized from RPC
  simpBalance: INITIAL_SIMP,
};

let currentReserves: PoolReserves = {
  ethReserve: 0,
  simpReserve: 0,
};

/**
 * Convert number to scaled BigInt for integer arithmetic
 * Uses string conversion to avoid JavaScript precision issues
 */
function toBigInt(value: number): bigint {
  // Convert to string with sufficient precision to avoid floating-point issues
  const str = value.toFixed(18);
  const [integer, decimal = ''] = str.split('.');
  const paddedDecimal = decimal.padEnd(18, '0');
  return BigInt(integer + paddedDecimal);
}

/**
 * Convert scaled BigInt back to number
 */
function toNumber(value: bigint): number {
  return Number(value) / Number(SCALE);
}

/**
 * Initialize or reset the calculator state
 * Gets actual ETH balance from RPC to account for deployment gas variations
 */
export async function initializeCalculator(): Promise<void> {
  const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
  const ethBalanceWei = await provider.getBalance(TEST_WALLET_ADDRESS);
  const ethBalance = Number(ethers.formatEther(ethBalanceWei));

  currentBalances = {
    ethBalance,
    simpBalance: INITIAL_SIMP,
  };
  currentReserves = {
    ethReserve: 0,
    simpReserve: 0,
  };
}

/**
 * Get current balances
 */
export function getCurrentBalances(): BalanceState {
  return { ...currentBalances };
}

/**
 * Get current pool reserves
 */
export function getCurrentReserves(): PoolReserves {
  return { ...currentReserves };
}

/**
 * Update balances and pool reserves after adding liquidity
 * @param ethAmount ETH amount added to liquidity
 * @param simpAmount SIMP amount added to liquidity
 * @param actualGasCost Actual gas cost in ETH (required)
 */
export function updateBalancesAfterAddLiquidity(
  ethAmount: number,
  simpAmount: number,
  actualGasCost: number
): void {
  const gasCost = actualGasCost;
  currentBalances = {
    ethBalance: currentBalances.ethBalance - ethAmount - gasCost,
    simpBalance: currentBalances.simpBalance - simpAmount,
  };
  currentReserves = {
    ethReserve: currentReserves.ethReserve + ethAmount,
    simpReserve: currentReserves.simpReserve + simpAmount,
  };
}

/**
 * Update balances and pool reserves after swapping ETH for SIMP
 * Uses contract's exact integer arithmetic with 0.3% fee: amountInWithFee = amountIn * 997 / 1000
 * @param ethSwapAmount ETH amount being swapped
 * @param actualGasCost Actual gas cost in ETH (required)
 */
export function updateBalancesAfterSwapEthForSimp(
  ethSwapAmount: number,
  actualGasCost: number
): void {
  // Convert to BigInt for integer arithmetic
  const amountIn = toBigInt(ethSwapAmount);
  const reserveSimplest = toBigInt(currentReserves.simpReserve);
  const reserveETH = toBigInt(currentReserves.ethReserve);

  // Apply 0.3% fee exactly as contract does: (amountIn * 997) / 1000
  const amountInWithFee = (amountIn * 997n) / 1000n;

  // Calculate SIMP output using contract's exact formula
  // amountOut = (reserveSimplest * amountInWithFee) / (reserveETH + amountInWithFee)
  const simpOutputBigInt =
    (reserveSimplest * amountInWithFee) / (reserveETH + amountInWithFee);
  const simpOutput = toNumber(simpOutputBigInt);

  const gasCost = actualGasCost;

  currentBalances = {
    ethBalance: currentBalances.ethBalance - ethSwapAmount - gasCost,
    simpBalance: currentBalances.simpBalance + simpOutput,
  };
  currentReserves = {
    ethReserve: currentReserves.ethReserve + ethSwapAmount,
    simpReserve: currentReserves.simpReserve - simpOutput,
  };
}

/**
 * Update balances and pool reserves after swapping SIMP for ETH
 * Uses contract's exact integer arithmetic with 0.3% fee: amountInWithFee = amountIn * 997 / 1000
 * @param simpSwapAmount SIMP amount being swapped
 * @param actualGasCost Actual gas cost in ETH (required)
 */
export function updateBalancesAfterSwapSimpForEth(
  simpSwapAmount: number,
  actualGasCost: number
): void {
  // Convert to BigInt for integer arithmetic
  const amountIn = toBigInt(simpSwapAmount);
  const reserveETH = toBigInt(currentReserves.ethReserve);
  const reserveSimplest = toBigInt(currentReserves.simpReserve);

  // Apply 0.3% fee exactly as contract does: (amountIn * 997) / 1000
  const amountInWithFee = (amountIn * 997n) / 1000n;

  // Calculate ETH output using contract's exact formula
  // amountOut = (reserveETH * amountInWithFee) / (reserveSimplest + amountInWithFee)
  const ethOutputBigInt =
    (reserveETH * amountInWithFee) / (reserveSimplest + amountInWithFee);
  const ethOutput = toNumber(ethOutputBigInt);

  const gasCost = actualGasCost;

  currentBalances = {
    ethBalance: currentBalances.ethBalance + ethOutput - gasCost,
    simpBalance: currentBalances.simpBalance - simpSwapAmount,
  };
  currentReserves = {
    ethReserve: currentReserves.ethReserve - ethOutput,
    simpReserve: currentReserves.simpReserve + simpSwapAmount,
  };
}
