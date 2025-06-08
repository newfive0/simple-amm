import React, { useState } from 'react';
import { ethers } from 'ethers';
import styles from './Swap.module.scss';

interface SwapProps {
  ammContract: ethers.Contract;
  tokenContract: ethers.Contract;
  contractAddresses: {
    tokenAddress: string;
    ammPoolAddress: string;
  };
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  onSwapComplete: () => void;
}

export const Swap: React.FC<SwapProps> = ({
  ammContract,
  tokenContract,
  contractAddresses,
  isLoading,
  setIsLoading,
  onSwapComplete,
}) => {
  const [ethAmount, setEthAmount] = useState<string>('');
  const [tokenAmount, setTokenAmount] = useState<string>('');
  const [swapDirection, setSwapDirection] = useState<
    'eth-to-token' | 'token-to-eth'
  >('eth-to-token');

  // Handle swap from ETH to Token
  const swapETHForTokens = async () => {
    if (!ethAmount) {
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

      // Notify parent component to update balances
      onSwapComplete();
      setEthAmount('');
    } catch {
      alert('Swap failed. Check console for details.');
    }
    setIsLoading(false);
  };

  // Handle swap from Token to ETH
  const swapTokensForETH = async () => {
    if (!tokenAmount) {
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

      // Notify parent component to update balances
      onSwapComplete();
      setTokenAmount('');
    } catch {
      alert('Swap failed. Check console for details.');
    }
    setIsLoading(false);
  };

  return (
    <div className={styles.swap}>
      <h2>Swap Tokens</h2>

      <div className={styles.swapDirection}>
        <label>Swap Direction:</label>
        <select
          value={swapDirection}
          onChange={(e) =>
            setSwapDirection(e.target.value as 'eth-to-token' | 'token-to-eth')
          }
        >
          <option value="eth-to-token">ETH → Token</option>
          <option value="token-to-eth">Token → ETH</option>
        </select>
      </div>

      {swapDirection === 'eth-to-token' ? (
        <div className={styles.swapInput}>
          <label>ETH Amount:</label>
          <input
            type="number"
            step="0.01"
            value={ethAmount}
            onChange={(e) => setEthAmount(e.target.value)}
            placeholder="Enter ETH amount"
          />
          <button
            onClick={swapETHForTokens}
            disabled={isLoading || !ethAmount}
            className={`${styles.swapButton} ${styles.ethToToken}`}
          >
            {isLoading ? 'Swapping...' : 'Swap ETH for Tokens'}
          </button>
        </div>
      ) : (
        <div className={styles.swapInput}>
          <label>Token Amount:</label>
          <input
            type="number"
            step="0.01"
            value={tokenAmount}
            onChange={(e) => setTokenAmount(e.target.value)}
            placeholder="Enter token amount"
          />
          <button
            onClick={swapTokensForETH}
            disabled={isLoading || !tokenAmount}
            className={`${styles.swapButton} ${styles.tokenToEth}`}
          >
            {isLoading ? 'Swapping...' : 'Swap Tokens for ETH'}
          </button>
        </div>
      )}
    </div>
  );
};

export default Swap;
