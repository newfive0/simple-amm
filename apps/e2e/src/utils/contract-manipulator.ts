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
      console.log(
        `[ContractManipulator] Approving ${ethers.formatEther(tokenAmount)} SIMP tokens`
      );
      const approveTx = await this.tokenContract.approve(
        await this.ammContract.getAddress(),
        tokenAmount
      );
      await approveTx.wait();

      // Get expected LP tokens for minimal slippage protection
      const expectedLPTokens = await this.ammContract.getLiquidityOutput(
        tokenAmount,
        ethAmount
      );
      const minLPTokens = (expectedLPTokens * 995n) / 1000n; // 0.5% slippage tolerance

      // Add liquidity to pool
      const addLiquidityTx = await this.ammContract.addLiquidity(
        tokenAmount,
        minLPTokens,
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
      // Get expected outputs for slippage protection
      const ethReserve = await this.ammContract.reserveETH();
      const tokenReserve = await this.ammContract.reserveSimplest();
      const totalLPTokens = await this.ammContract.totalLPTokens();

      // Calculate expected outputs (proportional to LP token share)
      const expectedEth = (ethReserve * lpTokenAmount) / totalLPTokens;
      const expectedTokens = (tokenReserve * lpTokenAmount) / totalLPTokens;

      // Apply slippage tolerance
      const minEth = (expectedEth * 995n) / 1000n; // 0.5% slippage
      const minTokens = (expectedTokens * 995n) / 1000n; // 0.5% slippage

      // Remove liquidity
      const removeLiquidityTx = await this.ammContract.removeLiquidity(
        lpTokenAmount,
        minEth,
        minTokens
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
      const tokenAddress = await this.tokenContract.getAddress();
      const minTokenOutput = await this.ammContract.getSwapOutput(
        tokenAddress,
        ethAmount
      );
      const minTokenAmount = (minTokenOutput * 995n) / 1000n; // 0.5% slippage

      const swapTx = await this.ammContract.swap(
        tokenAddress,
        ethAmount,
        minTokenAmount,
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

      const ethAddress = '0x0000000000000000000000000000000000000000'; // ETH address
      const minEthOutput = await this.ammContract.getSwapOutput(
        ethAddress,
        tokenAmount
      );
      const minEthAmount = (minEthOutput * 995n) / 1000n; // 0.5% slippage

      const swapTx = await this.ammContract.swap(
        ethAddress,
        tokenAmount,
        minEthAmount
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
