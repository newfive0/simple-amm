import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { ethers } from 'ethers';

// TypeScript declaration for MetaMask
interface MetaMaskEthereum {
  request(args: { method: 'eth_requestAccounts' }): Promise<string[]>;
  request(args: { method: 'eth_accounts' }): Promise<string[]>;
  request(args: {
    method: string;
    params?: unknown[] | {
      type: string;
      options: {
        address: string;
        symbol: string;
        decimals: number;
      };
    };
  }): Promise<unknown>;
  on(event: string, callback: (accounts: string[]) => void): void;
  removeListener(event: string, callback: (accounts: string[]) => void): void;
}

declare global {
  interface Window {
    ethereum?: MetaMaskEthereum;
  }
}

interface WalletContextType {
  provider: ethers.BrowserProvider | null;
  account: string;
  isCheckingConnection: boolean;
  showCheckingMessage: boolean;
  networkError: string;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [account, setAccount] = useState<string>('');
  const [isCheckingConnection, setIsCheckingConnection] = useState<boolean>(true);
  const [showCheckingMessage, setShowCheckingMessage] = useState<boolean>(false);
  const [networkError, setNetworkError] = useState<string>('');

  // Connect wallet function
  const connectWallet = useCallback(async () => {
    if (!window.ethereum) {
      setNetworkError('MetaMask not detected. Please install MetaMask.');
      return;
    }

    try {
      setNetworkError('');

      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      if (!Array.isArray(accounts) || accounts.length === 0) {
        throw new Error('No accounts returned');
      }

      const ethProvider = new ethers.BrowserProvider(window.ethereum);
      const signer = await ethProvider.getSigner();
      const userAddress = await signer.getAddress();

      setProvider(ethProvider);
      setAccount(userAddress);

      window.localStorage.setItem('walletConnected', 'true');
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      setNetworkError('Failed to connect wallet. Please try again.');
    }
  }, []);

  // Disconnect wallet function
  const disconnectWallet = useCallback(() => {
    setProvider(null);
    setAccount('');
    window.localStorage.removeItem('walletConnected');
  }, []);

  // Check for existing wallet connection on page load
  useEffect(() => {
    const checkWalletConnection = async () => {
      if (window.ethereum && window.localStorage.getItem('walletConnected') === 'true') {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          if (Array.isArray(accounts) && accounts.length > 0) {
            await connectWallet();
          } else {
            window.localStorage.removeItem('walletConnected');
          }
        } catch (error) {
          console.error('Failed to check wallet connection:', error);
          window.localStorage.removeItem('walletConnected');
        }
      }
      setIsCheckingConnection(false);
    };

    // Show checking message after a delay
    const timer = window.setTimeout(() => {
      setShowCheckingMessage(true);
    }, 1000);

    checkWalletConnection();

    return () => window.clearTimeout(timer);
  }, [connectWallet]);

  // Set up account change listener
  useEffect(() => {
    if (window.ethereum) {
      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length === 0) {
          disconnectWallet();
        } else if (accounts[0] !== account) {
          connectWallet();
        }
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);

      return () => {
        if (window.ethereum) {
          window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        }
      };
    }
    
    return undefined;
  }, [account, connectWallet, disconnectWallet]);

  const value: WalletContextType = {
    provider,
    account,
    isCheckingConnection,
    showCheckingMessage,
    networkError,
    connectWallet,
    disconnectWallet,
  };

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}