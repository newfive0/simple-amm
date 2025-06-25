import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { ethers } from 'ethers';
import { EIP1193Provider } from 'eip-1193';

declare global {
  interface Window {
    ethereum?: EIP1193Provider;
  }
}

interface WalletContextType {
  provider: ethers.BrowserProvider | null;
  account: string;
  isCheckingConnection: boolean;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

// Type guard to ensure window.ethereum exists
const ensureEthereumWallet = (): EIP1193Provider => {
  if (!window.ethereum) {
    throw new Error('Ethereum wallet required. Please install a Web3 wallet extension.');
  }
  return window.ethereum;
};

export const WalletProvider = ({ children }: { children: ReactNode }) => {
  // Check if wallet is available immediately when component initializes
  ensureEthereumWallet();
  
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [account, setAccount] = useState<string>('');
  const [isCheckingConnection, setIsCheckingConnection] = useState<boolean>(true);

  // Request wallet connection (permission)
  const requestWalletConnection = useCallback(async () => {
    const ethereum = ensureEthereumWallet();

    const accounts = await ethereum.request({
      method: 'eth_requestAccounts',
    });

    if (!Array.isArray(accounts) || accounts.length === 0) {
      throw new Error('No accounts returned');
    }

    return accounts;
  }, []);

  // Initialize wallet state after connection
  const initializeWalletState = useCallback(async () => {
    const ethereum = ensureEthereumWallet();

    const ethProvider = new ethers.BrowserProvider(ethereum);
    const signer = await ethProvider.getSigner();
    const userAddress = await signer.getAddress();

    setProvider(ethProvider);
    setAccount(userAddress);
  }, []);

  // Connect wallet function (combines both actions)
  const connectWallet = useCallback(async () => {
    await requestWalletConnection();
    await initializeWalletState();
    window.localStorage.setItem('walletConnected', 'true');
  }, [requestWalletConnection, initializeWalletState]);

  // Disconnect wallet function
  const disconnectWallet = useCallback(() => {
    setProvider(null);
    setAccount('');
    window.localStorage.removeItem('walletConnected');
  }, []);

  // Check for existing wallet connection on page load
  useEffect(() => {
    const checkWalletConnection = async () => {
      if (window.localStorage.getItem('walletConnected') === 'true') {
        // Only initialize state, don't request permission again
        await initializeWalletState();
      }
      setIsCheckingConnection(false);
    };

    checkWalletConnection();
  }, [initializeWalletState]);

  // Set up account change listener
  useEffect(() => {
    const ethereum = ensureEthereumWallet();
    
    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        disconnectWallet();
      } else if (accounts[0] !== account) {
        connectWallet();
      }
    };

    ethereum.on('accountsChanged', handleAccountsChanged);

    return () => {
      ethereum.removeListener('accountsChanged', handleAccountsChanged);
    };
  }, [account, connectWallet, disconnectWallet]);

  const value: WalletContextType = {
    provider,
    account,
    isCheckingConnection,
    connectWallet,
    disconnectWallet,
  };

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};