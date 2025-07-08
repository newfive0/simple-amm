/**
 * Utility class for calculating expected balances in AMM functionality tests
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

/**
 * Balance calculator class for tracking wallet and pool state during AMM tests
 */
export class BalanceCalculator {
  // Constants
  private static readonly INITIAL_SIMP = 1000000;
  private static readonly TEST_WALLET_ADDRESS =
    '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'; // Hardhat default account 0
  private static readonly SCALE = 10n ** 18n; // Scale factor for integer arithmetic (18 decimal places)

  // Instance state
  private balances: BalanceState;
  private reserves: PoolReserves;

  constructor() {
    this.balances = {
      ethBalance: 0, // Will be initialized from RPC
      simpBalance: BalanceCalculator.INITIAL_SIMP,
    };
    this.reserves = {
      ethReserve: 0,
      simpReserve: 0,
    };
  }

  /**
   * Convert number to scaled BigInt for integer arithmetic
   * Uses string conversion to avoid JavaScript precision issues
   */
  private toBigInt(value: number): bigint {
    // Convert to string with sufficient precision to avoid floating-point issues
    const str = value.toFixed(18);
    const [integer, decimal = ''] = str.split('.');
    const paddedDecimal = decimal.padEnd(18, '0');
    return BigInt(integer + paddedDecimal);
  }

  /**
   * Convert scaled BigInt back to number
   */
  private toNumber(value: bigint): number {
    return Number(value) / Number(BalanceCalculator.SCALE);
  }

  /**
   * Initialize or reset the calculator state
   * Gets actual ETH balance from RPC to account for deployment gas variations
   */
  async initialize(): Promise<void> {
    const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
    const ethBalanceWei = await provider.getBalance(
      BalanceCalculator.TEST_WALLET_ADDRESS
    );
    const ethBalance = Number(ethers.formatEther(ethBalanceWei));

    this.balances = {
      ethBalance,
      simpBalance: BalanceCalculator.INITIAL_SIMP,
    };
    this.reserves = {
      ethReserve: 0,
      simpReserve: 0,
    };
  }

  /**
   * Get current balances
   */
  getCurrentBalances(): BalanceState {
    return { ...this.balances };
  }

  /**
   * Get current pool reserves
   */
  getCurrentReserves(): PoolReserves {
    return { ...this.reserves };
  }

  /**
   * Update balances and pool reserves after adding liquidity
   * @param ethAmount ETH amount added to liquidity
   * @param simpAmount SIMP amount added to liquidity
   * @param actualGasCost Actual gas cost in ETH (required)
   */
  updateBalancesAfterAddLiquidity(
    ethAmount: number,
    simpAmount: number,
    actualGasCost: number
  ): void {
    this.balances = {
      ethBalance: this.balances.ethBalance - ethAmount - actualGasCost,
      simpBalance: this.balances.simpBalance - simpAmount,
    };
    this.reserves = {
      ethReserve: this.reserves.ethReserve + ethAmount,
      simpReserve: this.reserves.simpReserve + simpAmount,
    };
  }

  /**
   * Update balances and pool reserves after swapping ETH for SIMP
   * Uses contract's exact integer arithmetic with 0.3% fee: amountInWithFee = amountIn * 997 / 1000
   * @param ethSwapAmount ETH amount being swapped
   * @param actualGasCost Actual gas cost in ETH (required)
   */
  updateBalancesAfterSwapEthForSimp(
    ethSwapAmount: number,
    actualGasCost: number
  ): void {
    // Convert to BigInt for integer arithmetic
    const amountIn = this.toBigInt(ethSwapAmount);
    const reserveSimplest = this.toBigInt(this.reserves.simpReserve);
    const reserveETH = this.toBigInt(this.reserves.ethReserve);

    // Apply 0.3% fee exactly as contract does: (amountIn * 997) / 1000
    const amountInWithFee = (amountIn * 997n) / 1000n;

    // Calculate SIMP output using contract's exact formula
    // amountOut = (reserveSimplest * amountInWithFee) / (reserveETH + amountInWithFee)
    const simpOutputBigInt =
      (reserveSimplest * amountInWithFee) / (reserveETH + amountInWithFee);
    const simpOutput = this.toNumber(simpOutputBigInt);

    this.balances = {
      ethBalance: this.balances.ethBalance - ethSwapAmount - actualGasCost,
      simpBalance: this.balances.simpBalance + simpOutput,
    };
    this.reserves = {
      ethReserve: this.reserves.ethReserve + ethSwapAmount,
      simpReserve: this.reserves.simpReserve - simpOutput,
    };
  }

  /**
   * Update balances and pool reserves after swapping SIMP for ETH
   * Uses contract's exact integer arithmetic with 0.3% fee: amountInWithFee = amountIn * 997 / 1000
   * @param simpSwapAmount SIMP amount being swapped
   * @param actualGasCost Actual gas cost in ETH (required)
   */
  updateBalancesAfterSwapSimpForEth(
    simpSwapAmount: number,
    actualGasCost: number
  ): void {
    // Convert to BigInt for integer arithmetic
    const amountIn = this.toBigInt(simpSwapAmount);
    const reserveETH = this.toBigInt(this.reserves.ethReserve);
    const reserveSimplest = this.toBigInt(this.reserves.simpReserve);

    // Apply 0.3% fee exactly as contract does: (amountIn * 997) / 1000
    const amountInWithFee = (amountIn * 997n) / 1000n;

    // Calculate ETH output using contract's exact formula
    // amountOut = (reserveETH * amountInWithFee) / (reserveSimplest + amountInWithFee)
    const ethOutputBigInt =
      (reserveETH * amountInWithFee) / (reserveSimplest + amountInWithFee);
    const ethOutput = this.toNumber(ethOutputBigInt);

    this.balances = {
      ethBalance: this.balances.ethBalance + ethOutput - actualGasCost,
      simpBalance: this.balances.simpBalance - simpSwapAmount,
    };
    this.reserves = {
      ethReserve: this.reserves.ethReserve - ethOutput,
      simpReserve: this.reserves.simpReserve + simpSwapAmount,
    };
  }
}
