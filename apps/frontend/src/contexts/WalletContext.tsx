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
  isCheckingConnection: boolean;
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
  // Check if wallet is available immediately when component initializes
  ensureEthereumWallet();

  const [ethereumProvider, setEthereumProvider] =
    useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);
  const [account, setAccount] = useState<string>("");
  const [isCheckingConnection, setIsCheckingConnection] =
    useState<boolean>(true);

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

    setEthereumProvider(ethProvider);
    setSigner(ethSigner);
    setAccount(userAddress);
  }, []);

  // Reset wallet state to disconnected
  const resetWalletState = useCallback(() => {
    setEthereumProvider(null);
    setSigner(null);
    setAccount("");
  }, []);

  // Connect wallet function (combines both actions)
  const connectWallet = useCallback(async () => {
    try {
      await requestWalletConnection();
      await initializeWalletState();
    } catch (error) {
      // Reset state on connection failure
      resetWalletState();
      throw error; // Re-throw to allow error handling in UI
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
      } finally {
        setIsCheckingConnection(false);
      }
    };

    checkConnection();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Set up account change listener
  useEffect(() => {
    const ethereum = ensureEthereumWallet();

    const handleAccountsChanged = (accounts: string[]) => {
      // Standard EIP-1193 accountsChanged event provides array of connected account addresses:
      // - Empty array []: User disconnected wallet or locked their wallet
      // - One or more addresses: Currently connected accounts (we use accounts[0])
      // - Multiple accounts: User has multiple accounts connected (rare, most dapps use first)

      if (accounts.length === 0) {
        // User disconnected or locked wallet - clean up our connection state
        resetWalletState();
      } else {
        // User switched to different account - initialize with new account (already approved)
        // We check current account inside the handler to avoid stale closure
        initializeWalletState().catch(() => {
          resetWalletState();
        });
      }
    };

    ethereum.on("accountsChanged", handleAccountsChanged);

    return () => {
      ethereum.removeListener("accountsChanged", handleAccountsChanged);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const value: WalletContextType = {
    ethereumProvider,
    signer,
    account,
    isCheckingConnection,
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