import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { ethers } from 'ethers';
import { EIP1193Provider } from 'eip-1193';

declare global {
  interface Window {
    ethereum?: EIP1193Provider;
  }
}

export interface WalletContextType {
  ethereumProvider: ethers.BrowserProvider | null;
  signer: ethers.JsonRpcSigner | null;
  account: string;
  error: string | null;
  connectWallet: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

// Type guard to ensure window.ethereum exists
const ensureEthereumWallet = (): EIP1193Provider => {
  if (!window.ethereum) {
    throw new Error(
      "Ethereum wallet required. Please install a Web3 wallet extension."
    );
  }
  return window.ethereum;
};

export const WalletProvider = ({ children }: { children: ReactNode }) => {
  // Don't check wallet availability during component construction to avoid test errors
  // The actual check happens during connection attempts

  const [walletState, setWalletState] = useState({
    ethereumProvider: null as ethers.BrowserProvider | null,
    signer: null as ethers.JsonRpcSigner | null,
    account: "",
    error: null as string | null,
  });

  // Request wallet connection (permission)
  const requestWalletConnection = useCallback(async () => {
    const ethereum = ensureEthereumWallet();

    const accounts = await ethereum.request({
      method: "eth_requestAccounts",
    });

    if (!Array.isArray(accounts) || accounts.length === 0) {
      throw new Error("No accounts returned");
    }

    return accounts;
  }, []);

  // Initialize wallet state after connection
  const initializeWalletState = useCallback(async () => {
    const ethereum = ensureEthereumWallet();

    const ethProvider = new ethers.BrowserProvider(ethereum);
    const ethSigner = await ethProvider.getSigner(); // Gets signer for accounts[0] (primary account)
    const userAddress = await ethSigner.getAddress();

    // Single state update - only 1 re-render!
    setWalletState(prev => ({
      ...prev,
      ethereumProvider: ethProvider,
      signer: ethSigner,
      account: userAddress,
    }));
  }, []);

  // Reset wallet state to disconnected
  const resetWalletState = useCallback(() => {
    setWalletState({
      ethereumProvider: null,
      signer: null,
      account: "",
      error: null,
    });
  }, []);


  // Connect wallet function (combines both actions)
  const connectWallet = useCallback(async () => {
    try {
      // Clear any previous errors before attempting connection
      setWalletState(prev => ({ ...prev, error: null }));
      await requestWalletConnection();
      await initializeWalletState();
    } catch (error) {
      // Reset state on connection failure and set error message
      resetWalletState();
      const errorMessage = error instanceof Error ? error.message : 'Connection failed';
      setWalletState(prev => ({ ...prev, error: errorMessage }));
      // Don't re-throw - handle error silently to prevent unhandled rejections in tests
    }
  }, [requestWalletConnection, initializeWalletState, resetWalletState]);

  // Check for existing wallet connection on page load
  useEffect(() => {
    const checkConnection = async () => {
      try {
        // Try to initialize wallet state - if wallet was previously connected,
        // this will succeed silently. If not connected, it will fail and reset state.
        await initializeWalletState();
      } catch {
        // Reset state on failure (wallet not connected or permission revoked)
        resetWalletState();
      }
    };

    checkConnection();
  }, [initializeWalletState, resetWalletState]);

  // Set up account change listener
  useEffect(() => {
    try {
      const ethereum = ensureEthereumWallet();

      const handleAccountsChanged = (accounts: string[]) => {
        // Standard EIP-1193 accountsChanged event provides array of connected account addresses:
        // - Empty array []: User disconnected wallet or locked their wallet
        // - One or more addresses: Currently connected accounts (we use accounts[0])
        // - Multiple accounts: User has multiple accounts connected (rare, most dapps use first)
        if (accounts.length === 0) {
          // User disconnected or locked wallet - clean up our connection state
          resetWalletState();
        } else if (accounts[0] !== walletState.account) {
          // User switched to different account - initialize with new account (already approved)
          initializeWalletState().catch(() => {
            resetWalletState();
          });
        }
        // If accounts[0] === account, no change needed (same account still connected)
      };

      ethereum.on("accountsChanged", handleAccountsChanged);

      return () => {
        ethereum.removeListener("accountsChanged", handleAccountsChanged);
      };
    } catch (error) {
      // Handle case where ethereum wallet is not available (testing environment)
      console.error('Failed to set up account change listener:', error);
      return; // Return undefined cleanup function when ethereum is not available
    }
  }, [walletState.account, initializeWalletState, resetWalletState]);

  const value: WalletContextType = {
    ethereumProvider: walletState.ethereumProvider,
    signer: walletState.signer,
    account: walletState.account,
    error: walletState.error,
    connectWallet,
  };

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  );
};

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};