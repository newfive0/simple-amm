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
  private currentNonce: number | null = null;

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
   * Get the next available nonce for this wallet
   */
  private async getNextNonce(): Promise<number> {
    if (this.currentNonce === null) {
      this.currentNonce = await this.provider.getTransactionCount(
        this.wallet.address,
        'pending'
      );
    }
    const nonce = this.currentNonce;
    this.currentNonce++;
    return nonce;
  }

  /**
   * Reset the nonce cache - useful between test runs
   */
  async resetNonce(): Promise<void> {
    this.currentNonce = null;
  }

  /**
   * Add liquidity to the AMM pool
   */
  async addLiquidity(ethAmount: bigint, tokenAmount: bigint): Promise<void> {
    console.log(
      `[ContractManipulator] Adding liquidity: ${ethers.formatEther(ethAmount)} ETH + ${ethers.formatEther(tokenAmount)} SIMP`
    );

    // Approve token spending with explicit nonce
    const approveNonce = await this.getNextNonce();
    const approveTx = await this.tokenContract.approve(
      await this.ammContract.getAddress(),
      tokenAmount,
      { nonce: approveNonce }
    );
    await approveTx.wait();

    // Add liquidity to pool with explicit nonce
    const addLiquidityNonce = await this.getNextNonce();
    const addLiquidityTx = await this.ammContract.addLiquidity(
      tokenAmount,
      0, // minLPTokens = 0 for simplicity
      { value: ethAmount, nonce: addLiquidityNonce }
    );
    await addLiquidityTx.wait();

    console.log(`[ContractManipulator] Liquidity added successfully`);
  }

  /**
   * Remove liquidity from the AMM pool
   */
  async removeLiquidity(lpTokenAmount: bigint): Promise<void> {
    console.log(
      `[ContractManipulator] Removing ${ethers.formatEther(lpTokenAmount)} LP tokens`
    );

    // Remove liquidity with explicit nonce
    const removeNonce = await this.getNextNonce();
    const removeLiquidityTx = await this.ammContract.removeLiquidity(
      lpTokenAmount,
      0, // minAmountSimplest = 0 for simplicity
      0, // minAmountETH = 0 for simplicity
      { nonce: removeNonce }
    );
    await removeLiquidityTx.wait();

    console.log(`[ContractManipulator] Liquidity removed successfully`);
  }

  /**
   * Swap ETH for SIMP tokens
   */
  async swapEthForTokens(ethAmount: bigint): Promise<void> {
    console.log(
      `[ContractManipulator] Swapping ${ethers.formatEther(ethAmount)} ETH for SIMP tokens`
    );

    // For ETH → SIMP swap with explicit nonce
    const swapNonce = await this.getNextNonce();
    const ethAddress = '0x0000000000000000000000000000000000000000';
    const swapTx = await this.ammContract.swap(
      ethAddress, // tokenIn = address(0) for ETH
      0, // amountIn = 0 since we use msg.value for ETH amount
      0, // minAmountOut = 0 for simplicity
      { value: ethAmount, nonce: swapNonce }
    );
    await swapTx.wait();

    console.log(`[ContractManipulator] ETH → SIMP swap completed successfully`);
  }

  /**
   * Swap SIMP tokens for ETH
   */
  async swapTokensForEth(tokenAmount: bigint): Promise<void> {
    console.log(
      `[ContractManipulator] Swapping ${ethers.formatEther(tokenAmount)} SIMP tokens for ETH`
    );

    // Approve token spending first with explicit nonce
    const approveNonce = await this.getNextNonce();
    const approveTx = await this.tokenContract.approve(
      await this.ammContract.getAddress(),
      tokenAmount,
      { nonce: approveNonce }
    );
    await approveTx.wait();

    // For SIMP → ETH swap with explicit nonce
    const swapNonce = await this.getNextNonce();
    const tokenAddress = await this.tokenContract.getAddress();
    const swapTx = await this.ammContract.swap(
      tokenAddress, // tokenIn = token address for SIMP
      tokenAmount, // amountIn = token amount to swap
      0, // minAmountOut = 0 for simplicity
      { nonce: swapNonce }
    );
    await swapTx.wait();

    console.log(`[ContractManipulator] SIMP → ETH swap completed successfully`);
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
