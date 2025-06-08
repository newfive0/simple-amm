import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { WalletInfo } from '../components';

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
  const [ethAmount, setEthAmount] = useState<string>('');
  const [tokenAmount, setTokenAmount] = useState<string>('');
  const [tokenBalance, setTokenBalance] = useState<string>('0');
  const [ethBalance, setEthBalance] = useState<string>('0');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [swapDirection, setSwapDirection] = useState<
    'eth-to-token' | 'token-to-eth'
  >('eth-to-token');
  const [tokenName, setTokenName] = useState<string>('');
  const [tokenSymbol, setTokenSymbol] = useState<string>('');
  const [networkError, setNetworkError] = useState<string>('');
  const [contractAddresses, setContractAddresses] = useState<{
    tokenAddress: string;
    ammPoolAddress: string;
  } | null>(null);
  const [poolEthBalance, setPoolEthBalance] = useState<string>('0');
  const [poolTokenBalance, setPoolTokenBalance] = useState<string>('0');
  const [liquidityEthAmount, setLiquidityEthAmount] = useState<string>('');
  const [liquidityTokenAmount, setLiquidityTokenAmount] = useState<string>('');

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
        } else {
          setAccount('');
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

          // Try to add token to MetaMask with the correct symbol
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
          } catch {
            // Silently handle MetaMask token addition errors
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

  // Handle swap from ETH to Token
  const swapETHForTokens = async () => {
    if (!ammContract || !ethAmount) {
      return;
    }

    setIsLoading(true);
    try {
      const tx = await ammContract.swap(
        ethers.ZeroAddress, // address(0) for ETH
        0, // amountIn is 0 for ETH swaps
        { value: ethers.parseEther(ethAmount) },
      );
      await tx.wait();

      // Update balances after swap
      if (tokenContract && provider) {
        await updateBalances(tokenContract, provider, account);
      }
      setEthAmount('');
    } catch {
      alert('Swap failed. Check console for details.');
    }
    setIsLoading(false);
  };

  // Handle swap from Token to ETH
  const swapTokensForETH = async () => {
    if (!ammContract || !tokenContract || !tokenAmount || !contractAddresses) {
      return;
    }

    setIsLoading(true);
    try {
      // First approve the AMM to spend tokens
      const approveTx = await tokenContract.approve(
        contractAddresses.ammPoolAddress,
        ethers.parseEther(tokenAmount),
      );
      await approveTx.wait();

      // Then swap tokens for ETH
      const swapTx = await ammContract.swap(
        contractAddresses.tokenAddress,
        ethers.parseEther(tokenAmount),
      );
      await swapTx.wait();

      // Update balances after swap
      if (provider) {
        await updateBalances(tokenContract, provider, account);
      }
      setTokenAmount('');
    } catch {
      alert('Swap failed. Check console for details.');
    }
    setIsLoading(false);
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

  // Add liquidity to the pool
  const addLiquidity = async () => {
    if (
      !ammContract ||
      !tokenContract ||
      !liquidityEthAmount ||
      !liquidityTokenAmount
    ) {
      return;
    }

    setIsLoading(true);
    try {
      // First approve the AMM to spend tokens
      const approveTx = await tokenContract.approve(
        contractAddresses!.ammPoolAddress,
        ethers.parseEther(liquidityTokenAmount),
      );
      await approveTx.wait();

      // Then add liquidity
      const addLiquidityTx = await ammContract.addLiquidity(
        ethers.parseEther(liquidityTokenAmount),
        { value: ethers.parseEther(liquidityEthAmount) },
      );
      await addLiquidityTx.wait();

      // Update balances after adding liquidity
      if (provider) {
        await updateBalances(tokenContract, provider, account);
        await updatePoolBalances();
      }
      setLiquidityEthAmount('');
      setLiquidityTokenAmount('');
    } catch {
      alert('Failed to add liquidity. Check console for details.');
    }
    setIsLoading(false);
  };

  // Update pool balances when account changes or on mount
  useEffect(() => {
    if (ammContract && provider) {
      updatePoolBalances();
    }
  }, [account, ammContract, provider, updatePoolBalances]);

  return (
    <div
      style={{
        padding: '20px',
        maxWidth: '600px',
        margin: '0 auto',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      <h1 style={{ textAlign: 'center', color: '#333' }}>Simple AMM</h1>

      {networkError && (
        <div
          style={{
            padding: '10px',
            marginBottom: '20px',
            backgroundColor: '#ffebee',
            color: '#c62828',
            borderRadius: '4px',
            textAlign: 'center',
          }}
        >
          {networkError}
        </div>
      )}

      {!account ? (
        <div style={{ textAlign: 'center', marginTop: '50px' }}>
          <button
            onClick={connectWallet}
            style={{
              padding: '12px 24px',
              fontSize: '16px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
            }}
          >
            Connect MetaMask
          </button>
        </div>
      ) : (
        <div>
          <WalletInfo
            account={account}
            ethBalance={ethBalance}
            tokenBalance={tokenBalance}
            tokenSymbol={tokenSymbol}
            tokenName={tokenName}
          />

          {/* Swap Section */}
          <div
            style={{
              marginBottom: '30px',
              padding: '20px',
              backgroundColor: '#ffffff',
              border: '1px solid #e9ecef',
              borderRadius: '8px',
            }}
          >
            <h2 style={{ marginTop: 0, color: '#333' }}>Swap Tokens</h2>

            <div style={{ marginBottom: '20px' }}>
              <label
                style={{
                  display: 'block',
                  marginBottom: '10px',
                  fontWeight: 'bold',
                }}
              >
                Swap Direction:
              </label>
              <select
                value={swapDirection}
                onChange={(e) =>
                  setSwapDirection(
                    e.target.value as 'eth-to-token' | 'token-to-eth',
                  )
                }
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '6px',
                  border: '1px solid #ddd',
                  fontSize: '16px',
                }}
              >
                <option value="eth-to-token">ETH → Token</option>
                <option value="token-to-eth">Token → ETH</option>
              </select>
            </div>

            {swapDirection === 'eth-to-token' ? (
              <div style={{ marginBottom: '20px' }}>
                <label
                  style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontWeight: 'bold',
                  }}
                >
                  ETH Amount:
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={ethAmount}
                  onChange={(e) => setEthAmount(e.target.value)}
                  placeholder="Enter ETH amount"
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '6px',
                    border: '1px solid #ddd',
                    fontSize: '16px',
                    boxSizing: 'border-box',
                  }}
                />
                <button
                  onClick={swapETHForTokens}
                  disabled={isLoading || !ethAmount}
                  style={{
                    width: '100%',
                    padding: '12px',
                    marginTop: '10px',
                    fontSize: '16px',
                    backgroundColor: isLoading ? '#6c757d' : '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                  }}
                >
                  {isLoading ? 'Swapping...' : 'Swap ETH for Tokens'}
                </button>
              </div>
            ) : (
              <div style={{ marginBottom: '20px' }}>
                <label
                  style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontWeight: 'bold',
                  }}
                >
                  Token Amount:
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={tokenAmount}
                  onChange={(e) => setTokenAmount(e.target.value)}
                  placeholder="Enter token amount"
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '6px',
                    border: '1px solid #ddd',
                    fontSize: '16px',
                    boxSizing: 'border-box',
                  }}
                />
                <button
                  onClick={swapTokensForETH}
                  disabled={isLoading || !tokenAmount}
                  style={{
                    width: '100%',
                    padding: '12px',
                    marginTop: '10px',
                    fontSize: '16px',
                    backgroundColor: isLoading ? '#6c757d' : '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                  }}
                >
                  {isLoading ? 'Swapping...' : 'Swap Tokens for ETH'}
                </button>
              </div>
            )}
          </div>

          {/* Liquidity Section */}
          <div
            style={{
              marginBottom: '30px',
              padding: '20px',
              backgroundColor: '#ffffff',
              border: '1px solid #e9ecef',
              borderRadius: '8px',
            }}
          >
            <h2 style={{ marginTop: 0, color: '#333' }}>Add Liquidity</h2>

            <div
              style={{
                marginBottom: '20px',
                padding: '15px',
                backgroundColor: '#e9ecef',
                borderRadius: '8px',
              }}
            >
              <h3 style={{ margin: '0 0 10px 0' }}>Pool Balances:</h3>
              <p>
                <strong>ETH:</strong> {parseFloat(poolEthBalance).toFixed(4)}{' '}
                ETH
              </p>
              <p>
                <strong>Tokens:</strong>{' '}
                {parseFloat(poolTokenBalance).toFixed(4)} {tokenSymbol}
              </p>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label
                style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: 'bold',
                }}
              >
                ETH Amount:
              </label>
              <input
                type="number"
                step="0.01"
                value={liquidityEthAmount}
                onChange={(e) => setLiquidityEthAmount(e.target.value)}
                placeholder="Enter ETH amount"
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '6px',
                  border: '1px solid #ddd',
                  fontSize: '16px',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label
                style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: 'bold',
                }}
              >
                Token Amount:
              </label>
              <input
                type="number"
                step="0.01"
                value={liquidityTokenAmount}
                onChange={(e) => setLiquidityTokenAmount(e.target.value)}
                placeholder="Enter token amount"
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '6px',
                  border: '1px solid #ddd',
                  fontSize: '16px',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <button
              onClick={addLiquidity}
              disabled={
                isLoading || !liquidityEthAmount || !liquidityTokenAmount
              }
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '16px',
                backgroundColor: isLoading ? '#6c757d' : '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
              }}
            >
              {isLoading ? 'Adding Liquidity...' : 'Add Liquidity'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
