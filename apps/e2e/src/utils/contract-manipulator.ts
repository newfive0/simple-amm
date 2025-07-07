import { ethers } from 'ethers';
import {
  AMMPool,
  AMMPool__factory,
  Token,
  Token__factory,
} from '../../artifacts/typechain-types';

/**
 * ContractManipulator allows direct blockchain contract interaction
 * for testing scenarios like slippage protection and edge cases
 */
export class ContractManipulator {
  private provider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet;
  private ammContract: AMMPool;
  private tokenContract: Token;

  constructor() {
    // Connect to local Hardhat network
    this.provider = new ethers.JsonRpcProvider('http://localhost:8545');

    // Use Account #2 (different from MetaMask tests to avoid nonce conflicts)
    const privateKey =
      '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a';
    this.wallet = new ethers.Wallet(privateKey, this.provider);

    // Get contract addresses from environment
    const tokenAddress = process.env.VITE_TOKEN_ADDRESS;
    const ammAddress = process.env.VITE_AMM_POOL_ADDRESS;

    if (!tokenAddress || !ammAddress) {
      throw new Error('Contract addresses not found in environment variables');
    }

    // Initialize contract instances
    this.tokenContract = Token__factory.connect(tokenAddress, this.wallet);
    this.ammContract = AMMPool__factory.connect(ammAddress, this.wallet);
  }

  /**
   * Add liquidity to the AMM pool
   */
  async addLiquidity(ethAmount: bigint, tokenAmount: bigint): Promise<void> {
    console.log(
      `[ContractManipulator] Adding liquidity: ${ethers.formatEther(ethAmount)} ETH + ${ethers.formatEther(tokenAmount)} SIMP`
    );

    try {
      // Approve token spending
      const approveTx = await this.tokenContract.approve(
        await this.ammContract.getAddress(),
        tokenAmount
      );
      await approveTx.wait();

      // Add liquidity to pool (no slippage protection for simplicity)
      const addLiquidityTx = await this.ammContract.addLiquidity(
        tokenAmount,
        0, // minLPTokens = 0 for simplicity
        { value: ethAmount }
      );
      await addLiquidityTx.wait();

      console.log(`[ContractManipulator] Liquidity added successfully`);
    } catch (error) {
      console.error(`[ContractManipulator] Failed to add liquidity:`, error);
      throw error;
    }
  }

  /**
   * Remove liquidity from the AMM pool
   */
  async removeLiquidity(lpTokenAmount: bigint): Promise<void> {
    console.log(
      `[ContractManipulator] Removing ${ethers.formatEther(lpTokenAmount)} LP tokens`
    );

    try {
      // Remove liquidity (no slippage protection for simplicity)
      const removeLiquidityTx = await this.ammContract.removeLiquidity(
        lpTokenAmount,
        0, // minAmountSimplest = 0 for simplicity
        0 // minAmountETH = 0 for simplicity
      );
      await removeLiquidityTx.wait();

      console.log(`[ContractManipulator] Liquidity removed successfully`);
    } catch (error) {
      console.error(`[ContractManipulator] Failed to remove liquidity:`, error);
      throw error;
    }
  }

  /**
   * Swap ETH for SIMP tokens
   */
  async swapEthForTokens(ethAmount: bigint): Promise<void> {
    console.log(
      `[ContractManipulator] Swapping ${ethers.formatEther(ethAmount)} ETH for SIMP tokens`
    );

    try {
      // For ETH → SIMP swap: tokenIn = address(0), amountIn = 0 (uses msg.value), minAmountOut = 0
      const ethAddress = '0x0000000000000000000000000000000000000000';
      const swapTx = await this.ammContract.swap(
        ethAddress, // tokenIn = address(0) for ETH
        0, // amountIn = 0 since we use msg.value for ETH amount
        0, // minAmountOut = 0 for simplicity
        { value: ethAmount }
      );
      await swapTx.wait();

      console.log(
        `[ContractManipulator] ETH → SIMP swap completed successfully`
      );
    } catch (error) {
      console.error(`[ContractManipulator] ETH → SIMP swap failed:`, error);
      throw error;
    }
  }

  /**
   * Swap SIMP tokens for ETH
   */
  async swapTokensForEth(tokenAmount: bigint): Promise<void> {
    console.log(
      `[ContractManipulator] Swapping ${ethers.formatEther(tokenAmount)} SIMP tokens for ETH`
    );

    try {
      // Approve token spending first
      const approveTx = await this.tokenContract.approve(
        await this.ammContract.getAddress(),
        tokenAmount
      );
      await approveTx.wait();

      // For SIMP → ETH swap: tokenIn = tokenAddress, amountIn = tokenAmount, minAmountOut = 0
      const tokenAddress = await this.tokenContract.getAddress();
      const swapTx = await this.ammContract.swap(
        tokenAddress, // tokenIn = token address for SIMP
        tokenAmount, // amountIn = token amount to swap
        0 // minAmountOut = 0 for simplicity
      );
      await swapTx.wait();

      console.log(
        `[ContractManipulator] SIMP → ETH swap completed successfully`
      );
    } catch (error) {
      console.error(`[ContractManipulator] SIMP → ETH swap failed:`, error);
      throw error;
    }
  }

  /**
   * Get current pool state for verification
   */
  async getPoolState(): Promise<{
    ethReserve: bigint;
    tokenReserve: bigint;
    totalLPTokens: bigint;
  }> {
    const ethReserve = await this.ammContract.reserveETH();
    const tokenReserve = await this.ammContract.reserveSimplest();
    const totalLPTokens = await this.ammContract.totalLPTokens();

    return {
      ethReserve,
      tokenReserve,
      totalLPTokens,
    };
  }
}
