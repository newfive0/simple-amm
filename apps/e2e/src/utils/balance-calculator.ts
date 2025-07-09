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
  totalLPTokens: number;
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
      totalLPTokens: 0,
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
      totalLPTokens: 0,
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
  addLiquidity(
    ethAmount: number,
    simpAmount: number,
    actualGasCost: number
  ): void {
    this.balances = {
      ethBalance: this.balances.ethBalance - ethAmount - actualGasCost,
      simpBalance: this.balances.simpBalance - simpAmount,
    };

    let lpTokenAmount: number;
    if (this.reserves.totalLPTokens === 0) {
      lpTokenAmount = Math.sqrt(simpAmount * ethAmount);
    } else {
      const lpFromSimp =
        (simpAmount * this.reserves.totalLPTokens) / this.reserves.simpReserve;
      const lpFromEth =
        (ethAmount * this.reserves.totalLPTokens) / this.reserves.ethReserve;
      lpTokenAmount = Math.min(lpFromSimp, lpFromEth);
    }

    this.reserves = {
      ethReserve: this.reserves.ethReserve + ethAmount,
      simpReserve: this.reserves.simpReserve + simpAmount,
      totalLPTokens: this.reserves.totalLPTokens + lpTokenAmount,
    };
  }

  /**
   * Update balances and pool reserves after removing liquidity
   * @param lpTokenAmount LP token amount being removed
   * @param actualGasCost Actual gas cost in ETH (required)
   */
  removeLiquidity(lpTokenAmount: number, actualGasCost: number): void {
    const totalLPTokens = this.reserves.totalLPTokens;
    const simpOutput =
      (lpTokenAmount * this.reserves.simpReserve) / totalLPTokens;
    const ethOutput =
      (lpTokenAmount * this.reserves.ethReserve) / totalLPTokens;

    this.balances = {
      ethBalance: this.balances.ethBalance + ethOutput - actualGasCost,
      simpBalance: this.balances.simpBalance + simpOutput,
    };

    this.reserves = {
      ethReserve: this.reserves.ethReserve - ethOutput,
      simpReserve: this.reserves.simpReserve - simpOutput,
      totalLPTokens: this.reserves.totalLPTokens - lpTokenAmount,
    };
  }

  /**
   * Calculate required ETH input for desired SIMP output (reverse calculation)
   * Uses AMM formula: ethInput = (ethReserve * simpOutput * 1000) / ((simpReserve - simpOutput) * 997)
   * @param simpOutput Desired SIMP output amount
   * @returns Required ETH input amount
   */
  calculateEthNeededToBuySimp(simpOutput: number): number {
    const simpOutputBigInt = this.toBigInt(simpOutput);
    const ethReserveBigInt = this.toBigInt(this.reserves.ethReserve);
    const simpReserveBigInt = this.toBigInt(this.reserves.simpReserve);

    // ethInput = (ethReserve * simpOutput * 1000) / ((simpReserve - simpOutput) * 997)
    const ethInputBigInt =
      (ethReserveBigInt * simpOutputBigInt * 1000n) /
      ((simpReserveBigInt - simpOutputBigInt) * 997n);

    return this.toNumber(ethInputBigInt);
  }

  /**
   * Calculate required SIMP input for desired ETH output (reverse calculation)
   * Uses AMM formula: simpInput = (simpReserve * ethOutput * 1000) / ((ethReserve - ethOutput) * 997)
   * @param ethOutput Desired ETH output amount
   * @returns Required SIMP input amount
   */
  calculateSimpNeededToBuyEth(ethOutput: number): number {
    const ethOutputBigInt = this.toBigInt(ethOutput);
    const ethReserveBigInt = this.toBigInt(this.reserves.ethReserve);
    const simpReserveBigInt = this.toBigInt(this.reserves.simpReserve);

    // simpInput = (simpReserve * ethOutput * 1000) / ((ethReserve - ethOutput) * 997)
    const simpInputBigInt =
      (simpReserveBigInt * ethOutputBigInt * 1000n) /
      ((ethReserveBigInt - ethOutputBigInt) * 997n);

    return this.toNumber(simpInputBigInt);
  }

  /**
   * Update balances after buying SIMP with ETH (reverse calculation)
   * @param simpOutput Desired SIMP output amount
   * @param actualGasCost Actual gas cost in ETH
   */
  buySimpWithEth(simpOutput: number, actualGasCost: number): void {
    const ethInput = this.calculateEthNeededToBuySimp(simpOutput);

    this.balances = {
      ethBalance: this.balances.ethBalance - ethInput - actualGasCost,
      simpBalance: this.balances.simpBalance + simpOutput,
    };
    this.reserves = {
      ethReserve: this.reserves.ethReserve + ethInput,
      simpReserve: this.reserves.simpReserve - simpOutput,
      totalLPTokens: this.reserves.totalLPTokens,
    };
  }

  /**
   * Update balances after buying ETH with SIMP (reverse calculation)
   * @param ethOutput Desired ETH output amount
   * @param actualGasCost Actual gas cost in ETH
   */
  buyEthWithSimp(ethOutput: number, actualGasCost: number): void {
    const simpInput = this.calculateSimpNeededToBuyEth(ethOutput);

    this.balances = {
      ethBalance: this.balances.ethBalance + ethOutput - actualGasCost,
      simpBalance: this.balances.simpBalance - simpInput,
    };
    this.reserves = {
      ethReserve: this.reserves.ethReserve - ethOutput,
      simpReserve: this.reserves.simpReserve + simpInput,
      totalLPTokens: this.reserves.totalLPTokens,
    };
  }

  /**
   * Calculate required token amount for adding liquidity to maintain pool ratio
   * @param ethAmount ETH amount to add
   * @returns Required SIMP token amount to maintain ratio
   */
  calculateRequiredTokenAmount(ethAmount: number): number {
    if (
      ethAmount <= 0 ||
      this.reserves.ethReserve <= 0 ||
      this.reserves.simpReserve <= 0
    ) {
      return 0;
    }

    // Use BigInt arithmetic for precision: tokenAmount = (ethAmount * poolTokenReserve) / poolEthReserve
    const ethAmountBigInt = this.toBigInt(ethAmount);
    const ethReserveBigInt = this.toBigInt(this.reserves.ethReserve);
    const simpReserveBigInt = this.toBigInt(this.reserves.simpReserve);

    const requiredTokenAmountBigInt =
      (ethAmountBigInt * simpReserveBigInt) / ethReserveBigInt;

    return this.toNumber(requiredTokenAmountBigInt);
  }
}
