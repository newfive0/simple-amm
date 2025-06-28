import { ethers } from 'ethers';
import { Token__factory, AMMPool__factory } from '@typechain-types';
import { config } from '../config';

export interface WalletBalances {
  ethBalance: number;
  tokenBalance: number;
}

export interface PoolBalances {
  ethReserve: number;
  tokenReserve: number;
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

export const getPoolBalances = async (
  signer: ethers.JsonRpcSigner
): Promise<PoolBalances> => {
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

export const getTokenSymbol = async (
  signer: ethers.JsonRpcSigner
): Promise<string> => {
  const tokenContract = Token__factory.connect(
    config.contracts.tokenAddress,
    signer
  );
  return await tokenContract.symbol();
};
