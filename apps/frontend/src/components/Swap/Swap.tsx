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

  const handleError = (error: unknown) => {
    console.error('Swap failed:', error);
    alert('Swap failed. Check console for details.');
  };

  const resetForm = () => {
    setEthAmount('');
    setTokenAmount('');
  };

  const executeSwapTransaction = async (callback: () => Promise<void>) => {
    setIsLoading(true);
    try {
      await callback();
      onSwapComplete();
      resetForm();
    } catch (error) {
      handleError(error);
    } finally {
      setIsLoading(false);
    }
  };

  const approveTokenSpending = async (amount: string) => {
    const approveTx = await tokenContract.approve(
      contractAddresses.ammPoolAddress,
      ethers.parseEther(amount),
    );
    await approveTx.wait();
  };

  const swapETHForTokens = async () => {
    if (!ethAmount) return;

    await executeSwapTransaction(async () => {
      const tx = await ammContract.swap(
        ethers.ZeroAddress,
        0,
        { value: ethers.parseEther(ethAmount) },
      );
      await tx.wait();
    });
  };

  const swapTokensForETH = async () => {
    if (!tokenAmount) return;

    await executeSwapTransaction(async () => {
      await approveTokenSpending(tokenAmount);
      const tx = await ammContract.swap(
        contractAddresses.tokenAddress,
        ethers.parseEther(tokenAmount),
      );
      await tx.wait();
    });
  };

  const SwapDirectionSelector = () => (
    <div className={styles.swapDirection}>
      <label>Swap Direction:</label>
      <select
        value={swapDirection}
        onChange={(e) => setSwapDirection(e.target.value as 'eth-to-token' | 'token-to-eth')}
      >
        <option value="eth-to-token">ETH → Token</option>
        <option value="token-to-eth">Token → ETH</option>
      </select>
    </div>
  );

  const SwapInput = ({ 
    label, 
    value, 
    onChange, 
    placeholder, 
    onClick, 
    buttonText, 
    buttonClass 
  }: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    onClick: () => void;
    buttonText: string;
    buttonClass: string;
  }) => (
    <div className={styles.swapInput}>
      <label>{label}</label>
      <input
        type="number"
        step="0.01"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
      <button
        onClick={onClick}
        disabled={isLoading || !value}
        className={`${styles.swapButton} ${buttonClass}`}
      >
        {isLoading ? 'Swapping...' : buttonText}
      </button>
    </div>
  );

  return (
    <div className={styles.swap}>
      <h2>Swap Tokens</h2>
      <SwapDirectionSelector />
      {swapDirection === 'eth-to-token' ? (
        <SwapInput
          label="ETH Amount:"
          value={ethAmount}
          onChange={setEthAmount}
          placeholder="Enter ETH amount"
          onClick={swapETHForTokens}
          buttonText="Swap ETH for Tokens"
          buttonClass={styles.ethToToken}
        />
      ) : (
        <SwapInput
          label="Token Amount:"
          value={tokenAmount}
          onChange={setTokenAmount}
          placeholder="Enter token amount"
          onClick={swapTokensForETH}
          buttonText="Swap Tokens for ETH"
          buttonClass={styles.tokenToEth}
        />
      )}
    </div>
  );
};

export default Swap;
