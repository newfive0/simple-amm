import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { ethers } from 'ethers';
import { EIP1193Provider } from 'eip-1193';
import {
  getFriendlyMessage,
  ERROR_OPERATIONS,
  WALLET_REQUIRED_ERROR,
} from '../utils/errorMessages';
import { useErrorMessage } from './ErrorMessageContext';

declare global {
  interface Window {
    ethereum?: EIP1193Provider;
  }
}

export interface WalletContextType {
  ethereumProvider: ethers.BrowserProvider | null;
  signer: ethers.JsonRpcSigner | null;
  account: string;
  connectWallet: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider = ({ children }: { children: ReactNode }) => {
  const { setErrorMessage } = useErrorMessage();
  const [walletState, setWalletState] = useState({
    ethereumProvider: null as ethers.BrowserProvider | null,
    signer: null as ethers.JsonRpcSigner | null,
    account: '',
  });

  // Check for wallet availability and set error if needed
  useEffect(() => {
    if (!window.ethereum) {
      setErrorMessage(WALLET_REQUIRED_ERROR);
    }
  }, [setErrorMessage]);

  // Request wallet connection (permission)
  const requestWalletConnection = useCallback(
    async (ethereum: EIP1193Provider) => {
      const accounts = await ethereum.request({
        method: 'eth_requestAccounts',
      });

      if (!Array.isArray(accounts) || accounts.length === 0) {
        throw new Error('No accounts returned');
      }

      return accounts;
    },
    []
  );

  // Initialize wallet state after connection
  const initializeWalletState = useCallback(
    async (ethereum: EIP1193Provider) => {
      const ethProvider = new ethers.BrowserProvider(ethereum);
      const ethSigner = await ethProvider.getSigner(); // Gets signer for accounts[0] (primary account)
      const userAddress = await ethSigner.getAddress();

      // Single state update - only 1 re-render!
      setWalletState((prev) => ({
        ...prev,
        ethereumProvider: ethProvider,
        signer: ethSigner,
        account: userAddress,
      }));

      // Clear any previous errors on successful connection
      setErrorMessage('');
    },
    [setErrorMessage]
  );

  // Reset wallet state to disconnected
  const resetWalletState = useCallback(() => {
    setWalletState({
      ethereumProvider: null,
      signer: null,
      account: '',
    });
  }, []);

  const connectWallet = useCallback(async () => {
    // Clear any previous errors before attempting connection
    setErrorMessage('');

    // Check if MetaMask is available first
    if (!window.ethereum) {
      setErrorMessage(WALLET_REQUIRED_ERROR);
      return;
    }

    try {
      await requestWalletConnection(window.ethereum);
      await initializeWalletState(window.ethereum);
    } catch (error) {
      // Reset state on connection failure and set error message
      resetWalletState();
      setErrorMessage(
        getFriendlyMessage(ERROR_OPERATIONS.WALLET_CONNECTION, error)
      );
    }
  }, [
    requestWalletConnection,
    initializeWalletState,
    resetWalletState,
    setErrorMessage,
  ]);

  // Set up account change listener
  useEffect(() => {
    // Don't set up listener if MetaMask is not available
    if (!window.ethereum) {
      return;
    }

    try {
      const ethereum = window.ethereum;

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
          initializeWalletState(ethereum).catch(() => {
            resetWalletState();
          });
        }
        // If accounts[0] === account, no change needed (same account still connected)
      };

      ethereum.on('accountsChanged', handleAccountsChanged);

      return () => {
        ethereum.removeListener('accountsChanged', handleAccountsChanged);
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
