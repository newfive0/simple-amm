import { ethers } from 'ethers';
import { Token__factory, AMMPool__factory } from '@typechain-types';
import { config } from '../config';

export interface WalletBalances {
  ethBalance: number;
  tokenBalance: number;
}

export interface PoolReserves {
  ethReserve: number;
  tokenReserve: number;
}

export interface LiquidityBalances {
  userLPTokens: number;
  totalLPTokens: number;
  poolOwnershipPercentage: number;
}

export const getWalletBalances = async (
  ethereumProvider: ethers.BrowserProvider,
  account: string,
  signer: ethers.JsonRpcSigner
): Promise<WalletBalances> => {
  const tokenContract = Token__factory.connect(
    config.contracts.tokenAddress,
    signer
  );

  const [ethBal, tokenBal] = await Promise.all([
    ethereumProvider.getBalance(account),
    tokenContract.balanceOf(account),
  ]);

  return {
    ethBalance: Number(ethers.formatEther(ethBal)),
    tokenBalance: Number(ethers.formatEther(tokenBal)),
  };
};

export const getPoolReserves = async (
  signer: ethers.JsonRpcSigner
): Promise<PoolReserves> => {
  const ammContract = AMMPool__factory.connect(
    config.contracts.ammPoolAddress,
    signer
  );

  const [ethReserve, tokenReserve] = await Promise.all([
    ammContract.reserveETH(),
    ammContract.reserveSimplest(),
  ]);

  return {
    ethReserve: Number(ethers.formatEther(ethReserve)),
    tokenReserve: Number(ethers.formatEther(tokenReserve)),
  };
};

export const ensureTokenSymbolIsSIMP = async (
  signer: ethers.JsonRpcSigner
): Promise<void> => {
  const tokenContract = Token__factory.connect(
    config.contracts.tokenAddress,
    signer
  );
  const symbol = await tokenContract.symbol();

  if (symbol !== 'SIMP') {
    throw new Error(`Expected token symbol to be 'SIMP', but got '${symbol}'`);
  }
};

export const getLiquidityBalances = async (
  signer: ethers.JsonRpcSigner,
  account: string
): Promise<LiquidityBalances> => {
  const ammContract = AMMPool__factory.connect(
    config.contracts.ammPoolAddress,
    signer
  );

  const [userLPTokensBN, totalLPTokensBN] = await Promise.all([
    ammContract.lpTokens(account),
    ammContract.totalLPTokens(),
  ]);

  const userLPTokens = Number(ethers.formatEther(userLPTokensBN));
  const totalLPTokens = Number(ethers.formatEther(totalLPTokensBN));

  // Calculate ownership percentage
  const poolOwnershipPercentage =
    totalLPTokens > 0 ? (userLPTokens / totalLPTokens) * 100 : 0;

  return {
    userLPTokens,
    totalLPTokens,
    poolOwnershipPercentage,
  };
};
