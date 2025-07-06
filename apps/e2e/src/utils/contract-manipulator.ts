/**
 * Minimal contract manipulation utility for creating slippage scenarios
 * Uses direct ethers.js interaction to add liquidity via RPC calls
 */

import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Contract addresses (loaded from deployment artifacts)
const DEPLOYED_ADDRESSES_PATH =
  '../../../../libs/contracts/ignition/deployments/chain-31337/deployed_addresses.json';
const AMM_ABI_PATH =
  '../../../../libs/contracts/artifacts/src/AMMPool.sol/AMMPool.json';
const TOKEN_ABI_PATH =
  '../../../../libs/contracts/artifacts/src/Token.sol/Token.json';

// Test wallet private key (Hardhat account #1 - different from MetaMask account #0)
const TEST_PRIVATE_KEY =
  '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d';
const RPC_URL = 'http://127.0.0.1:8545';

/**
 * Result interface for add liquidity operations
 */
export interface AddLiquidityResult {
  success: boolean;
  txHash?: string;
  error?: string;
}

/**
 * Minimal contract manipulator for slippage testing
 */
export class ContractManipulator {
  private provider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet;
  private ammContract: ethers.Contract;
  private tokenContract: ethers.Contract;
  private contractAddresses: { token: string; amm: string };

  constructor() {
    this.provider = new ethers.JsonRpcProvider(RPC_URL);
    this.wallet = new ethers.Wallet(TEST_PRIVATE_KEY, this.provider);

    // Load contract addresses
    const addressesPath = path.resolve(__dirname, DEPLOYED_ADDRESSES_PATH);
    const deployedAddresses = JSON.parse(
      fs.readFileSync(addressesPath, 'utf8')
    );

    this.contractAddresses = {
      token: deployedAddresses['TokenModule#SimplestToken'],
      amm: deployedAddresses['AMMPoolModule#AMMPool'],
    };

    // Load contract ABIs
    const ammAbiPath = path.resolve(__dirname, AMM_ABI_PATH);
    const tokenAbiPath = path.resolve(__dirname, TOKEN_ABI_PATH);

    const ammArtifact = JSON.parse(fs.readFileSync(ammAbiPath, 'utf8'));
    const tokenArtifact = JSON.parse(fs.readFileSync(tokenAbiPath, 'utf8'));

    // Create contract instances
    this.ammContract = new ethers.Contract(
      this.contractAddresses.amm,
      ammArtifact.abi,
      this.wallet
    );

    this.tokenContract = new ethers.Contract(
      this.contractAddresses.token,
      tokenArtifact.abi,
      this.wallet
    );
  }

  /**
   * Add liquidity directly via contract call (bypassing UI)
   * @param ethAmount - ETH amount in ether (string)
   * @param tokenAmount - Token amount in tokens (string)
   */
  async addLiquidity(
    ethAmount: string,
    tokenAmount: string
  ): Promise<AddLiquidityResult> {
    const ethAmountWei = ethers.parseEther(ethAmount);
    const tokenAmountWei = ethers.parseUnits(tokenAmount, 18);

    // Check current token balance
    const currentBalance = await this.tokenContract.balanceOf(
      this.wallet.address
    );

    // If we don't have enough tokens, transfer from account #0 (the minter)
    if (currentBalance < tokenAmountWei) {
      // Create account #0 wallet for token transfer
      const account0PrivateKey =
        '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
      const account0Wallet = new ethers.Wallet(
        account0PrivateKey,
        this.provider
      );
      const tokenContractFromAccount0 = new ethers.Contract(
        this.contractAddresses.token,
        this.tokenContract.interface,
        account0Wallet
      );

      // Transfer tokens from account #0 to account #1
      const transferTx = await tokenContractFromAccount0.transfer(
        this.wallet.address,
        tokenAmountWei
      );
      await transferTx.wait();
    }

    // First approve tokens
    const approveTx = await this.tokenContract.approve(
      this.contractAddresses.amm,
      tokenAmountWei
    );
    await approveTx.wait();

    // Then add liquidity (with minLPTokens = 0 for manipulation)
    // Get current nonce to ensure correct sequencing
    const currentNonce = await this.provider.getTransactionCount(
      this.wallet.address
    );

    const tx = await this.ammContract.addLiquidity(tokenAmountWei, 0, {
      value: ethAmountWei,
      nonce: currentNonce,
    });

    const receipt = await tx.wait();

    return {
      success: true,
      txHash: receipt.hash,
    };
  }
}
