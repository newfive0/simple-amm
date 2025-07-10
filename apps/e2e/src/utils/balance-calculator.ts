/**
 * Utility class for calculating expected balances in AMM functionality tests
 * Uses integer arithmetic to match smart contract precision exactly
 */

import { ethers } from 'ethers';

export interface BalanceState {
  ethBalance: bigint;
  simpBalance: bigint;
}

export interface PoolReserves {
  ethReserve: bigint;
  simpReserve: bigint;
  totalLPTokens: bigint;
}

/**
 * Balance calculator class for tracking wallet and pool state during AMM tests
 */
export class BalanceCalculator {
  // Constants
  private static readonly INITIAL_SIMP_WEI =
    BigInt(1000000) * BigInt(10) ** 18n; // 1M SIMP in WEI
  private static readonly TEST_WALLET_ADDRESS =
    '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'; // Hardhat default account 0

  // Instance state
  private balances: BalanceState;
  private reserves: PoolReserves;

  constructor() {
    this.balances = {
      ethBalance: 0n, // Will be initialized from RPC
      simpBalance: BalanceCalculator.INITIAL_SIMP_WEI,
    };
    this.reserves = {
      ethReserve: 0n,
      simpReserve: 0n,
      totalLPTokens: 0n,
    };
  }

  /**
   * Integer square root using Newton's method
   * @param value The value to find square root of
   * @returns Integer square root
   */
  private integerSqrt(value: bigint): bigint {
    if (value === 0n) return 0n;

    let x = value;
    let y = (x + 1n) / 2n;

    while (y < x) {
      x = y;
      y = (x + value / x) / 2n;
    }

    return x;
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

    this.balances = {
      ethBalance: ethBalanceWei,
      simpBalance: BalanceCalculator.INITIAL_SIMP_WEI,
    };
    this.reserves = {
      ethReserve: 0n,
      simpReserve: 0n,
      totalLPTokens: 0n,
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
   * @param ethAmountWei ETH amount added to liquidity in WEI
   * @param simpAmountWei SIMP amount added to liquidity in WEI
   * @param actualGasCostWei Actual gas cost in WEI (required)
   */
  addLiquidity(
    ethAmountWei: bigint,
    simpAmountWei: bigint,
    actualGasCostWei: bigint
  ): void {
    this.balances = {
      ethBalance: this.balances.ethBalance - ethAmountWei - actualGasCostWei,
      simpBalance: this.balances.simpBalance - simpAmountWei,
    };

    let lpTokenAmountWei: bigint;
    if (this.reserves.totalLPTokens === 0n) {
      // Initial liquidity: LP tokens = sqrt(ethAmount * simpAmount)
      // Using integer square root approximation
      lpTokenAmountWei = this.integerSqrt(ethAmountWei * simpAmountWei);
    } else {
      const lpFromSimp =
        (simpAmountWei * this.reserves.totalLPTokens) /
        this.reserves.simpReserve;
      const lpFromEth =
        (ethAmountWei * this.reserves.totalLPTokens) / this.reserves.ethReserve;
      lpTokenAmountWei = lpFromSimp < lpFromEth ? lpFromSimp : lpFromEth;
    }

    this.reserves = {
      ethReserve: this.reserves.ethReserve + ethAmountWei,
      simpReserve: this.reserves.simpReserve + simpAmountWei,
      totalLPTokens: this.reserves.totalLPTokens + lpTokenAmountWei,
    };
  }

  /**
   * Update balances and pool reserves after removing liquidity
   * @param lpTokenAmountWei LP token amount being removed in WEI
   * @param actualGasCostWei Actual gas cost in WEI (required)
   */
  removeLiquidity(lpTokenAmountWei: bigint, actualGasCostWei: bigint): void {
    const totalLPTokens = this.reserves.totalLPTokens;
    const simpOutputWei =
      (lpTokenAmountWei * this.reserves.simpReserve) / totalLPTokens;
    const ethOutputWei =
      (lpTokenAmountWei * this.reserves.ethReserve) / totalLPTokens;

    this.balances = {
      ethBalance: this.balances.ethBalance + ethOutputWei - actualGasCostWei,
      simpBalance: this.balances.simpBalance + simpOutputWei,
    };

    this.reserves = {
      ethReserve: this.reserves.ethReserve - ethOutputWei,
      simpReserve: this.reserves.simpReserve - simpOutputWei,
      totalLPTokens: this.reserves.totalLPTokens - lpTokenAmountWei,
    };
  }

  /**
   * Calculate required ETH input for desired SIMP output (reverse calculation)
   * Uses AMM formula: ethInput = (ethReserve * simpOutput * 1000) / ((simpReserve - simpOutput) * 997)
   * @param simpOutputWei Desired SIMP output amount in WEI
   * @returns Required ETH input amount in WEI
   */
  calculateEthNeededToBuySimp(simpOutputWei: bigint): bigint {
    const ethReserveWei = this.reserves.ethReserve;
    const simpReserveWei = this.reserves.simpReserve;

    // ethInput = (ethReserve * simpOutput * 1000) / ((simpReserve - simpOutput) * 997)
    const ethInputWei =
      (ethReserveWei * simpOutputWei * 1000n) /
      ((simpReserveWei - simpOutputWei) * 997n);

    return ethInputWei;
  }

  /**
   * Calculate required SIMP input for desired ETH output (reverse calculation)
   * Uses AMM formula: simpInput = (simpReserve * ethOutput * 1000) / ((ethReserve - ethOutput) * 997)
   * @param ethOutputWei Desired ETH output amount in WEI
   * @returns Required SIMP input amount in WEI
   */
  calculateSimpNeededToBuyEth(ethOutputWei: bigint): bigint {
    const ethReserveWei = this.reserves.ethReserve;
    const simpReserveWei = this.reserves.simpReserve;

    // simpInput = (simpReserve * ethOutput * 1000) / ((ethReserve - ethOutput) * 997)
    const simpInputWei =
      (simpReserveWei * ethOutputWei * 1000n) /
      ((ethReserveWei - ethOutputWei) * 997n);

    return simpInputWei;
  }

  /**
   * Update balances after buying SIMP with ETH (reverse calculation)
   * @param simpOutputWei Desired SIMP output amount in WEI
   * @param actualGasCostWei Actual gas cost in WEI
   */
  buySimpWithEth(simpOutputWei: bigint, actualGasCostWei: bigint): void {
    const ethInputWei = this.calculateEthNeededToBuySimp(simpOutputWei);

    this.balances = {
      ethBalance: this.balances.ethBalance - ethInputWei - actualGasCostWei,
      simpBalance: this.balances.simpBalance + simpOutputWei,
    };
    this.reserves = {
      ethReserve: this.reserves.ethReserve + ethInputWei,
      simpReserve: this.reserves.simpReserve - simpOutputWei,
      totalLPTokens: this.reserves.totalLPTokens,
    };
  }

  /**
   * Update balances after buying ETH with SIMP (reverse calculation)
   * @param ethOutputWei Desired ETH output amount in WEI
   * @param actualGasCostWei Actual gas cost in WEI
   */
  buyEthWithSimp(ethOutputWei: bigint, actualGasCostWei: bigint): void {
    const simpInputWei = this.calculateSimpNeededToBuyEth(ethOutputWei);

    this.balances = {
      ethBalance: this.balances.ethBalance + ethOutputWei - actualGasCostWei,
      simpBalance: this.balances.simpBalance - simpInputWei,
    };
    this.reserves = {
      ethReserve: this.reserves.ethReserve - ethOutputWei,
      simpReserve: this.reserves.simpReserve + simpInputWei,
      totalLPTokens: this.reserves.totalLPTokens,
    };
  }

  /**
   * Calculate required token amount for adding liquidity to maintain pool ratio
   * @param ethAmountWei ETH amount to add in WEI
   * @returns Required SIMP token amount in WEI to maintain ratio
   */
  calculateRequiredTokenAmount(ethAmountWei: bigint): bigint {
    if (
      ethAmountWei <= 0n ||
      this.reserves.ethReserve <= 0n ||
      this.reserves.simpReserve <= 0n
    ) {
      return 0n;
    }

    // tokenAmount = (ethAmount * poolTokenReserve) / poolEthReserve
    const requiredTokenAmountWei =
      (ethAmountWei * this.reserves.simpReserve) / this.reserves.ethReserve;

    return requiredTokenAmountWei;
  }

  /**
   * Calculate SIMP output from ETH input (forward calculation)
   * Uses AMM formula: simpOutput = (simpReserve * ethInput * 997) / ((ethReserve * 1000) + (ethInput * 997))
   * @param ethInputWei ETH input amount in WEI
   * @returns SIMP output amount in WEI
   */
  calculateSimpOutputFromEthInput(ethInputWei: bigint): bigint {
    const ethReserveWei = this.reserves.ethReserve;
    const simpReserveWei = this.reserves.simpReserve;

    // simpOutput = (simpReserve * ethInput * 997) / ((ethReserve * 1000) + (ethInput * 997))
    const simpOutputWei =
      (simpReserveWei * ethInputWei * 997n) /
      (ethReserveWei * 1000n + ethInputWei * 997n);

    return simpOutputWei;
  }

  /**
   * Update pool reserves after external swap (doesn't affect wallet balances)
   * @param ethInputWei ETH input amount in WEI
   * @param simpOutputWei SIMP output amount in WEI
   */
  updatePoolReservesAfterExternalSwap(
    ethInputWei: bigint,
    simpOutputWei: bigint
  ): void {
    this.reserves = {
      ethReserve: this.reserves.ethReserve + ethInputWei,
      simpReserve: this.reserves.simpReserve - simpOutputWei,
      totalLPTokens: this.reserves.totalLPTokens, // LP tokens unchanged
    };
  }

  /**
   * Track gas cost from failed transactions
   * @param gasCostWei Gas cost in WEI from failed transaction
   */
  trackFailedTransactionGasCost(gasCostWei: bigint): void {
    // Failed transactions still consume gas, so we need to subtract it from ETH balance
    this.balances = {
      ethBalance: this.balances.ethBalance - gasCostWei,
      simpBalance: this.balances.simpBalance,
    };
  }
}
