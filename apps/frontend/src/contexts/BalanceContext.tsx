import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { ethers } from 'ethers';
import { useWallet } from './WalletContext';
import { useContracts } from './ContractContext';

interface BalanceContextType {
  ethBalance: number;
  tokenBalance: number;
  poolEthBalance: number;
  poolTokenBalance: number;
  refreshBalances: () => Promise<void>;
  refreshPoolBalances: () => Promise<void>;
  refreshAllBalances: () => Promise<void>;
}

const BalanceContext = createContext<BalanceContextType | undefined>(undefined);

export const BalanceProvider = ({ children }: { children: ReactNode }) => {
  const { ethereumProvider, account } = useWallet();
  const { tokenContract, ammContract } = useContracts();
  
  // Throw errors during initialization if required dependencies are missing
  if (!ethereumProvider) {
    throw new Error('BalanceProvider requires an Ethereum provider. Please connect your wallet.');
  }
  if (!account) {
    throw new Error('BalanceProvider requires an account. Please connect your wallet.');
  }
  if (!tokenContract) {
    throw new Error('BalanceProvider requires a token contract. Please ensure contracts are loaded.');
  }
  if (!ammContract) {
    throw new Error('BalanceProvider requires an AMM contract. Please ensure contracts are loaded.');
  }
  
  const [ethBalance, setEthBalance] = useState<number>(0);
  const [tokenBalance, setTokenBalance] = useState<number>(0);
  const [poolEthBalance, setPoolEthBalance] = useState<number>(0);
  const [poolTokenBalance, setPoolTokenBalance] = useState<number>(0);

  // Refresh user balances
  const refreshBalances = useCallback(async () => {
    try {
      const [ethBal, tokenBal] = await Promise.all([
        ethereumProvider.getBalance(account),
        tokenContract.balanceOf(account),
      ]);

      setEthBalance(Number(ethers.formatEther(ethBal)));
      setTokenBalance(Number(ethers.formatEther(tokenBal)));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Failed to refresh balances: ${errorMessage}`);
    }
  }, [ethereumProvider, account, tokenContract]);

  // Refresh pool balances
  const refreshPoolBalances = useCallback(async () => {
    try {
      const [ethReserve, tokenReserve] = await Promise.all([
        ammContract.reserveETH(),
        ammContract.reserveSimplest(),
      ]);

      setPoolEthBalance(Number(ethers.formatEther(ethReserve)));
      setPoolTokenBalance(Number(ethers.formatEther(tokenReserve)));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Failed to refresh pool balances: ${errorMessage}`);
    }
  }, [ammContract]);

  // Refresh all balances
  const refreshAllBalances = useCallback(async () => {
    await Promise.all([refreshBalances(), refreshPoolBalances()]);
  }, [refreshBalances, refreshPoolBalances]);

  // Reset balances when wallet disconnects
  useEffect(() => {
    if (!account) {
      setEthBalance(0);
      setTokenBalance(0);
      setPoolEthBalance(0);
      setPoolTokenBalance(0);
    }
  }, [account]);

  // Update user balances when component mounts
  useEffect(() => {
    refreshBalances();
  }, [refreshBalances]);

  // Update pool balances when component mounts
  useEffect(() => {
    refreshPoolBalances();
  }, [refreshPoolBalances]);

  const value: BalanceContextType = {
    ethBalance,
    tokenBalance,
    poolEthBalance,
    poolTokenBalance,
    refreshBalances,
    refreshPoolBalances,
    refreshAllBalances,
  };

  return <BalanceContext.Provider value={value}>{children}</BalanceContext.Provider>;
}

export const useBalances = () => {
  const context = useContext(BalanceContext);
  if (context === undefined) {
    throw new Error('useBalances must be used within a BalanceProvider');
  }
  return context;
};