import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { WalletInfo, Swap, Liquidity } from '../components';

// TypeScript declaration for MetaMask
declare global {
  interface Window {
    ethereum?: {
      request: (args: {
        method: string;
        params?:
          | unknown[]
          | {
              type: string;
              options: {
                address: string;
                symbol: string;
                decimals: number;
              };
            };
      }) => Promise<unknown>;
      on: (event: string, callback: (accounts: string[]) => void) => void;
      removeListener: (event: string, callback: () => void) => void;
    };
  }
}

// Function to read contract addresses from deployment artifacts
const getContractAddresses = async () => {
  const response = await fetch('/deployed_addresses.json');
  const data = await response.json();
  return {
    tokenAddress: data['TokenModule#SimplestToken'],
    ammPoolAddress: data['AMMPoolModule#AMMPool'],
  };
};

// Function to load contract artifacts
const loadContractArtifacts = async () => {
  const [tokenResponse, ammPoolResponse] = await Promise.all([
    fetch('/artifacts/Token.json'),
    fetch('/artifacts/AMMPool.json'),
  ]);

  const tokenArtifact = await tokenResponse.json();
  const ammPoolArtifact = await ammPoolResponse.json();

  return {
    tokenAbi: tokenArtifact.abi,
    ammPoolAbi: ammPoolArtifact.abi,
  };
};

export function App() {
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [account, setAccount] = useState<string>('');
  const [tokenContract, setTokenContract] = useState<ethers.Contract | null>(
    null,
  );
  const [ammContract, setAmmContract] = useState<ethers.Contract | null>(null);
  const [tokenBalance, setTokenBalance] = useState<string>('0');
  const [ethBalance, setEthBalance] = useState<string>('0');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [tokenName, setTokenName] = useState<string>('');
  const [tokenSymbol, setTokenSymbol] = useState<string>('');
  const [networkError, setNetworkError] = useState<string>('');
  const [contractAddresses, setContractAddresses] = useState<{
    tokenAddress: string;
    ammPoolAddress: string;
  } | null>(null);
  const [poolEthBalance, setPoolEthBalance] = useState<string>('0');
  const [poolTokenBalance, setPoolTokenBalance] = useState<string>('0');
  const [isCheckingConnection, setIsCheckingConnection] = useState<boolean>(true);
  const [showCheckingMessage, setShowCheckingMessage] = useState<boolean>(false);

  // Load contract addresses and artifacts on mount
  useEffect(() => {
    const loadContracts = async () => {
      try {
        const [addresses] = await Promise.all([
          getContractAddresses(),
          loadContractArtifacts(),
        ]);
        setContractAddresses(addresses);

        // Store ABIs in state or context if needed
      } catch {
        setNetworkError(
          'Failed to load contracts. Please make sure contracts are deployed and artifacts are available.',
        );
      }
    };

    loadContracts();
  }, []);

  // Check for existing wallet connection on page load
  useEffect(() => {
    const checkWalletConnection = async () => {
      if (window.ethereum && window.localStorage.getItem('walletConnected') === 'true') {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          if (accounts.length > 0) {
            await connectWallet();
          } else {
            window.localStorage.removeItem('walletConnected');
          }
        } catch (error) {
          console.log('Failed to reconnect wallet:', error);
          window.localStorage.removeItem('walletConnected');
        }
      }
      setIsCheckingConnection(false);
      setShowCheckingMessage(false);
    };

    if (contractAddresses) {
      checkWalletConnection();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contractAddresses]);

  // Show checking message after delay to prevent flash
  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (isCheckingConnection) {
        setShowCheckingMessage(true);
      }
    }, 300); // Show after 300ms

    return () => window.clearTimeout(timer);
  }, [isCheckingConnection]);

  // Update balances when account changes or on mount
  useEffect(() => {
    if (tokenContract && provider && account) {
      updateBalances(tokenContract, provider, account);
    }
  }, [account, tokenContract, provider]);

  // Listen for account changes
  useEffect(() => {
    if (window.ethereum) {
      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          window.localStorage.setItem('walletConnected', 'true');
        } else {
          setAccount('');
          window.localStorage.removeItem('walletConnected');
          // Clear contracts and provider when disconnected
          setTokenContract(null);
          setAmmContract(null);
          setProvider(null);
        }
      };

      const handleChainChanged = () => {
        window.location.reload();
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);

      return () => {
        if (window.ethereum) {
          window.ethereum.removeListener('accountsChanged', () => {});
          window.ethereum.removeListener('chainChanged', () => {});
        }
      };
    }
  }, []);

  // Update user balances
  const updateBalances = async (
    token: ethers.Contract,
    provider: ethers.BrowserProvider,
    address: string,
  ) => {
    try {
      const tokenBal = await token.balanceOf(address);
      const ethBal = await provider.getBalance(address);

      const formattedTokenBal = ethers.formatEther(tokenBal);
      const formattedEthBal = ethers.formatEther(ethBal);

      setTokenBalance(formattedTokenBal);
      setEthBalance(formattedEthBal);
    } catch (error) {
      if (error instanceof Error) {
        setNetworkError(error.message);
      }
    }
  };

  // Connect to MetaMask
  const connectWallet = async () => {
    try {
      if (typeof window.ethereum !== 'undefined') {
        const provider = new ethers.BrowserProvider(window.ethereum);
        await provider.send('eth_requestAccounts', []);
        const signer = await provider.getSigner();
        const address = await signer.getAddress();
        const network = await provider.getNetwork();

        // Check if we're on the correct network (Hardhat local network)
        if (network.chainId !== 31337n) {
          setNetworkError(
            'Please connect to the Hardhat local network (chainId: 31337)',
          );
          return;
        }
        setNetworkError('');

        setProvider(provider);
        setAccount(address);
        
        // Save wallet connection state
        window.localStorage.setItem('walletConnected', 'true');

        // Initialize contracts with addresses and ABIs from artifacts
        if (!contractAddresses) {
          throw new Error('Contract addresses not loaded');
        }

        const artifacts = await loadContractArtifacts();

        const token = new ethers.Contract(
          contractAddresses.tokenAddress,
          artifacts.tokenAbi,
          signer,
        );
        const amm = new ethers.Contract(
          contractAddresses.ammPoolAddress,
          artifacts.ammPoolAbi,
          signer,
        );

        setTokenContract(token);
        setAmmContract(amm);

        // Get token info
        try {
          const name = await token.name();
          const symbol = await token.symbol();
          setTokenName(name);
          setTokenSymbol(symbol);

          // Try to add token to MetaMask with the correct symbol (only once per token/wallet)
          const tokenAddedKey = `tokenAdded_${contractAddresses.tokenAddress}_${address}`;
          if (!window.localStorage.getItem(tokenAddedKey)) {
            try {
              await window.ethereum?.request({
                method: 'wallet_watchAsset',
                params: {
                  type: 'ERC20' as const,
                  options: {
                    address: contractAddresses.tokenAddress,
                    symbol: symbol,
                    decimals: 18,
                  },
                },
              });
              // Mark token as added for this wallet
              window.localStorage.setItem(tokenAddedKey, 'true');
            } catch {
              // Silently handle MetaMask token addition errors
            }
          }
        } catch {
          // Silently handle token info errors
        }

        // Get balances
        await updateBalances(token, provider, address);
      } else {
        alert('Please install MetaMask!');
      }
    } catch (error) {
      if (error instanceof Error) {
        setNetworkError(error.message);
      }
    }
  };

  // Update pool balances
  const updatePoolBalances = useCallback(async () => {
    if (!ammContract || !provider) {
      return;
    }
    try {
      const ethReserve = await ammContract.reserveETH();
      const tokenReserve = await ammContract.reserveSimplest();
      setPoolEthBalance(ethers.formatEther(ethReserve));
      setPoolTokenBalance(ethers.formatEther(tokenReserve));
    } catch {
      // Silently handle pool balance errors
    }
  }, [ammContract, provider]);

  // Update pool balances when account changes or on mount
  useEffect(() => {
    if (ammContract && provider) {
      updatePoolBalances();
    }
  }, [account, ammContract, provider, updatePoolBalances]);

  // Callback for when swap completes to update balances
  const handleSwapComplete = async () => {
    if (tokenContract && provider) {
      await updateBalances(tokenContract, provider, account);
    }
  };

  const handleLiquidityComplete = async () => {
    if (provider && tokenContract) {
      await updateBalances(tokenContract, provider, account);
      await updatePoolBalances();
    }
  };

  return (
    <div
      style={{
        padding: '20px',
        maxWidth: '600px',
        margin: '0 auto',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      <h1 
        style={{ 
          textAlign: 'left', 
          color: '#333',
          padding: '20px',
          margin: '0 0 0 0',
          backgroundColor: '#ffffff',
          border: '1px solid #e9ecef',
          borderBottom: 'none',
          fontSize: '24px'
        }}
      >
        Very Simple AMM
      </h1>

      {networkError && (
        <div
          style={{
            padding: '10px',
            marginBottom: '20px',
            backgroundColor: '#ffebee',
            color: '#c62828',
            textAlign: 'center',
          }}
        >
          {networkError}
        </div>
      )}

      {isCheckingConnection && showCheckingMessage ? (
        <div style={{ 
          textAlign: 'center', 
          marginTop: '50px',
          padding: '20px',
          backgroundColor: '#ffffff',
          border: '1px solid #e9ecef'
        }}>
          <p>Checking wallet connection...</p>
        </div>
      ) : !isCheckingConnection && (!account || !ammContract || !tokenContract || !contractAddresses) ? (
        <div style={{ textAlign: 'center', marginTop: '50px' }}>
          <button
            onClick={connectWallet}
            style={{
              padding: '12px 24px',
              fontSize: '16px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Connect MetaMask
          </button>
        </div>
      ) : (
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '0' 
        }}>
          <WalletInfo
            account={account}
            ethBalance={ethBalance}
            tokenBalance={tokenBalance}
            tokenSymbol={tokenSymbol}
            tokenName={tokenName}
          />

          <Swap
            ammContract={ammContract}
            tokenContract={tokenContract}
            contractAddresses={contractAddresses}
            isLoading={isLoading}
            setIsLoading={setIsLoading}
            onSwapComplete={handleSwapComplete}
          />

          <Liquidity
            ammContract={ammContract}
            tokenContract={tokenContract}
            contractAddresses={contractAddresses}
            poolEthBalance={poolEthBalance}
            poolTokenBalance={poolTokenBalance}
            tokenSymbol={tokenSymbol}
            isLoading={isLoading}
            setIsLoading={setIsLoading}
            onLiquidityComplete={handleLiquidityComplete}
          />
        </div>
      )}
    </div>
  );
}

export default App;
