import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { ethers } from 'ethers';
import { useWallet } from './WalletContext';
import { useContracts } from './ContractContext';

interface BalanceContextType {
  ethBalance: string;
  tokenBalance: string;
  poolEthBalance: string;
  poolTokenBalance: string;
  refreshBalances: () => Promise<void>;
  refreshPoolBalances: () => Promise<void>;
  refreshAllBalances: () => Promise<void>;
}

const BalanceContext = createContext<BalanceContextType | undefined>(undefined);

export function BalanceProvider({ children }: { children: ReactNode }) {
  const { provider, account } = useWallet();
  const { tokenContract, contractAddresses } = useContracts();
  
  const [ethBalance, setEthBalance] = useState<string>('0');
  const [tokenBalance, setTokenBalance] = useState<string>('0');
  const [poolEthBalance, setPoolEthBalance] = useState<string>('0');
  const [poolTokenBalance, setPoolTokenBalance] = useState<string>('0');

  // Refresh user balances
  const refreshBalances = useCallback(async () => {
    if (!provider || !account || !tokenContract) return;

    try {
      const [ethBal, tokenBal] = await Promise.all([
        provider.getBalance(account),
        tokenContract.balanceOf(account),
      ]);

      setEthBalance(ethers.formatEther(ethBal));
      setTokenBalance(ethers.formatEther(tokenBal));
    } catch (error) {
      console.error('Failed to fetch user balances:', error);
    }
  }, [provider, account, tokenContract]);

  // Refresh pool balances
  const refreshPoolBalances = useCallback(async () => {
    if (!provider || !tokenContract || !contractAddresses) return;

    try {
      const [ethBal, tokenBal] = await Promise.all([
        provider.getBalance(contractAddresses.ammPoolAddress),
        tokenContract.balanceOf(contractAddresses.ammPoolAddress),
      ]);

      setPoolEthBalance(ethers.formatEther(ethBal));
      setPoolTokenBalance(ethers.formatEther(tokenBal));
    } catch (error) {
      console.error('Failed to fetch pool balances:', error);
    }
  }, [provider, tokenContract, contractAddresses]);

  // Refresh all balances
  const refreshAllBalances = useCallback(async () => {
    await Promise.all([refreshBalances(), refreshPoolBalances()]);
  }, [refreshBalances, refreshPoolBalances]);

  // Reset balances when wallet disconnects
  useEffect(() => {
    if (!account) {
      setEthBalance('0');
      setTokenBalance('0');
      setPoolEthBalance('0');
      setPoolTokenBalance('0');
    }
  }, [account]);

  // Update user balances when contracts are ready
  useEffect(() => {
    if (provider && account && tokenContract) {
      refreshBalances();
    }
  }, [provider, account, tokenContract, refreshBalances]);

  // Update pool balances when contracts are ready
  useEffect(() => {
    if (tokenContract && contractAddresses) {
      refreshPoolBalances();
    }
  }, [tokenContract, contractAddresses, refreshPoolBalances]);

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

export function useBalances() {
  const context = useContext(BalanceContext);
  if (context === undefined) {
    throw new Error('useBalances must be used within a BalanceProvider');
  }
  return context;
}