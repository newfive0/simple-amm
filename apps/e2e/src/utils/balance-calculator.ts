/**
 * Utility class for calculating expected balances in AMM functionality tests
 * Uses integer arithmetic to match smart contract precision exactly
 */

import { ethers } from 'ethers';
import {
  Token__factory,
  AMMPool__factory,
  Token,
  AMMPool,
} from '../../artifacts/typechain-types';

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
  private static readonly RPC_URL = 'http://127.0.0.1:8545';

  // Instance state
  private balances: BalanceState;
  private reserves: PoolReserves;
  private provider: ethers.JsonRpcProvider;
  private tokenContract: Token;
  private ammContract: AMMPool;

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

    // Initialize provider and contracts
    this.provider = new ethers.JsonRpcProvider(BalanceCalculator.RPC_URL);

    // Contract addresses will be set during initialization
    this.tokenContract = {} as Token;
    this.ammContract = {} as AMMPool;
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
    // Load contract addresses from environment
    const tokenAddress = process.env.VITE_TOKEN_ADDRESS;
    const ammAddress = process.env.VITE_AMM_POOL_ADDRESS;

    if (!tokenAddress || !ammAddress) {
      throw new Error('Contract addresses not found in environment variables');
    }

    // Initialize contracts
    this.tokenContract = Token__factory.connect(tokenAddress, this.provider);
    this.ammContract = AMMPool__factory.connect(ammAddress, this.provider);

    const ethBalanceWei = await this.provider.getBalance(
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
   * Fetch actual balances from blockchain
   */
  private async fetchActualBalances(): Promise<BalanceState> {
    const ethBalance = await this.provider.getBalance(
      BalanceCalculator.TEST_WALLET_ADDRESS
    );
    const simpBalance = await this.tokenContract.balanceOf(
      BalanceCalculator.TEST_WALLET_ADDRESS
    );

    return {
      ethBalance,
      simpBalance,
    };
  }

  /**
   * Fetch actual pool reserves from blockchain
   */
  private async fetchActualReserves(): Promise<PoolReserves> {
    const ethReserve = await this.ammContract.reserveETH();
    const simpReserve = await this.ammContract.reserveSimplest();
    const totalLPTokens = await this.ammContract.totalLPTokens();

    return {
      ethReserve,
      simpReserve,
      totalLPTokens,
    };
  }

  /**
   * Verify tracked balances match actual blockchain state with tolerance
   */
  private async verifyBalances(): Promise<void> {
    const actualBalances = await this.fetchActualBalances();
    const tolerance = 100n; // 100 WEI tolerance

    const ethDiff = this.balances.ethBalance - actualBalances.ethBalance;
    if (ethDiff < -tolerance || ethDiff > tolerance) {
      throw new Error(
        `ETH balance mismatch: tracked ${this.balances.ethBalance} vs actual ${actualBalances.ethBalance} (diff: ${ethDiff})`
      );
    }

    const simpDiff = this.balances.simpBalance - actualBalances.simpBalance;
    if (simpDiff < -tolerance || simpDiff > tolerance) {
      throw new Error(
        `SIMP balance mismatch: tracked ${this.balances.simpBalance} vs actual ${actualBalances.simpBalance} (diff: ${simpDiff})`
      );
    }

    // Amend our tracked balances to match blockchain values
    this.balances = {
      ethBalance: actualBalances.ethBalance,
      simpBalance: actualBalances.simpBalance,
    };
  }

  /**
   * Verify tracked reserves match actual blockchain state with tolerance
   */
  private async verifyReserves(): Promise<void> {
    const actualReserves = await this.fetchActualReserves();
    const tolerance = 100n; // 100 WEI tolerance

    const ethReserveDiff = this.reserves.ethReserve - actualReserves.ethReserve;
    if (ethReserveDiff < -tolerance || ethReserveDiff > tolerance) {
      throw new Error(
        `ETH reserve mismatch: tracked ${this.reserves.ethReserve} vs actual ${actualReserves.ethReserve} (diff: ${ethReserveDiff})`
      );
    }

    const simpReserveDiff =
      this.reserves.simpReserve - actualReserves.simpReserve;
    if (simpReserveDiff < -tolerance || simpReserveDiff > tolerance) {
      throw new Error(
        `SIMP reserve mismatch: tracked ${this.reserves.simpReserve} vs actual ${actualReserves.simpReserve} (diff: ${simpReserveDiff})`
      );
    }

    const lpTokensDiff =
      this.reserves.totalLPTokens - actualReserves.totalLPTokens;
    if (lpTokensDiff < -tolerance || lpTokensDiff > tolerance) {
      throw new Error(
        `LP tokens mismatch: tracked ${this.reserves.totalLPTokens} vs actual ${actualReserves.totalLPTokens} (diff: ${lpTokensDiff})`
      );
    }

    // Amend our tracked reserves to match blockchain values
    this.reserves = {
      ethReserve: actualReserves.ethReserve,
      simpReserve: actualReserves.simpReserve,
      totalLPTokens: actualReserves.totalLPTokens,
    };
  }

  /**
   * Get current balances and verify against blockchain
   */
  async getCurrentBalances(): Promise<BalanceState> {
    await this.verifyBalances();
    return { ...this.balances };
  }

  /**
   * Get current pool reserves and verify against blockchain
   */
  async getCurrentReserves(): Promise<PoolReserves> {
    await this.verifyReserves();
    return { ...this.reserves };
  }

  /**
   * Update balances and pool reserves after adding liquidity
   * @param ethAmountWei ETH amount added to liquidity in WEI
   * @param simpAmountWei SIMP amount added to liquidity in WEI
   * @param actualGasCostWei Actual gas cost in WEI (required)
   */
  async addLiquidity(
    ethAmountWei: bigint,
    simpAmountWei: bigint,
    actualGasCostWei: bigint
  ): Promise<void> {
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

    // Verify our tracked state matches blockchain state
    await this.verifyBalances();
    await this.verifyReserves();
  }

  /**
   * Update balances and pool reserves after removing liquidity
   * @param lpTokenAmountWei LP token amount being removed in WEI
   * @param actualGasCostWei Actual gas cost in WEI (required)
   */
  async removeLiquidity(
    lpTokenAmountWei: bigint,
    actualGasCostWei: bigint
  ): Promise<void> {
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

    // Verify our tracked state matches blockchain state
    await this.verifyBalances();
    await this.verifyReserves();
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
  async buySimpWithEth(
    simpOutputWei: bigint,
    actualGasCostWei: bigint
  ): Promise<void> {
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

    // Verify our tracked state matches blockchain state
    await this.verifyBalances();
    await this.verifyReserves();
  }

  /**
   * Update balances after buying ETH with SIMP (reverse calculation)
   * @param ethOutputWei Desired ETH output amount in WEI
   * @param actualGasCostWei Actual gas cost in WEI
   */
  async buyEthWithSimp(
    ethOutputWei: bigint,
    actualGasCostWei: bigint
  ): Promise<void> {
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

    // Verify our tracked state matches blockchain state
    await this.verifyBalances();
    await this.verifyReserves();
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
  async updatePoolReservesAfterExternalSwap(
    ethInputWei: bigint,
    simpOutputWei: bigint
  ): Promise<void> {
    this.reserves = {
      ethReserve: this.reserves.ethReserve + ethInputWei,
      simpReserve: this.reserves.simpReserve - simpOutputWei,
      totalLPTokens: this.reserves.totalLPTokens, // LP tokens unchanged
    };

    // Verify our tracked reserves match blockchain state
    await this.verifyReserves();
  }

  /**
   * Track gas cost from failed transactions
   * @param gasCostWei Gas cost in WEI from failed transaction
   */
  async trackFailedTransactionGasCost(gasCostWei: bigint): Promise<void> {
    // Failed transactions still consume gas, so we need to subtract it from ETH balance
    this.balances = {
      ethBalance: this.balances.ethBalance - gasCostWei,
      simpBalance: this.balances.simpBalance,
    };

    // Verify our tracked balances match blockchain state
    await this.verifyBalances();
  }
}
