import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { Token, AMMPool } from '@typechain-types';
import { InputWithOutput } from '../shared/InputWithOutput';
import { createSwapOutputCalculator } from '../../utils/expectedOutputCalculators';
import styles from './Swap.module.scss';

interface SwapInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  onClick: () => void;
  buttonText: string;
  isLoading: boolean;
  generateExpectedOutput: (value: string) => string;
  disabled?: boolean;
}

const SwapInput = ({
  value,
  onChange,
  placeholder,
  onClick,
  buttonText,
  isLoading,
  generateExpectedOutput,
  disabled = false,
}: SwapInputProps) => (
  <div className={styles.swapInput}>
    <InputWithOutput
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      generateExpectedOutput={generateExpectedOutput}
      disabled={disabled}
    />
    <button
      onClick={onClick}
      disabled={disabled || isLoading || !value}
      className={styles.swapButton}
    >
      {isLoading ? 'Waiting...' : buttonText}
    </button>
  </div>
);

// Swap Header with tabs
interface SwapHeaderProps {
  activeTab: 'eth-to-token' | 'token-to-eth';
  onTabChange: (tab: 'eth-to-token' | 'token-to-eth') => void;
  tokenSymbol: string;
  disabled?: boolean;
}

const SwapHeader = ({
  activeTab,
  onTabChange,
  tokenSymbol,
  disabled = false,
}: SwapHeaderProps) => (
  <div className={styles.header}>
    <h2 className={styles.title}>Swap</h2>
    <div className={styles.tabGroup}>
      <div className={styles.tabLabel}>Receive</div>
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'token-to-eth' ? styles.active : ''}`}
          onClick={() => onTabChange('token-to-eth')}
          disabled={disabled}
        >
          ETH
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'eth-to-token' ? styles.active : ''}`}
          onClick={() => onTabChange('eth-to-token')}
          disabled={disabled}
        >
          {tokenSymbol}
        </button>
      </div>
    </div>
  </div>
);

interface SwapProps {
  ammContract: AMMPool;
  tokenContract: Token;
  contractAddresses: {
    tokenAddress: string;
    ammPoolAddress: string;
  };
  poolEthReserve: number;
  poolTokenReserve: number;
  tokenSymbol: string;
  onSwapComplete: () => void;
}

export const Swap = ({
  ammContract,
  tokenContract,
  contractAddresses,
  poolEthReserve,
  poolTokenReserve,
  tokenSymbol,
  onSwapComplete,
}: SwapProps) => {
  const [ethAmount, setEthAmount] = useState<string>('');
  const [tokenAmount, setTokenAmount] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [swapDirection, setSwapDirection] = useState<
    'eth-to-token' | 'token-to-eth'
  >('token-to-eth');

  // Clear amounts when direction changes
  useEffect(() => {
    setEthAmount('');
    setTokenAmount('');
  }, [swapDirection]);

  const handleError = (error: unknown) => {
    const message =
      error instanceof Error ? error.message : 'Unknown error occurred';
    alert(`Swap failed: ${message}`);
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
      ethers.parseEther(amount)
    );
    await approveTx.wait();
  };

  const swapETHForTokens = async () => {
    if (!ethAmount) return;

    await executeSwapTransaction(async () => {
      const tx = await ammContract.swap(ethers.ZeroAddress, 0, {
        value: ethers.parseEther(ethAmount),
      });
      await tx.wait();
    });
  };

  const swapTokensForETH = async () => {
    if (!tokenAmount) return;

    await executeSwapTransaction(async () => {
      await approveTokenSpending(tokenAmount);
      const tx = await ammContract.swap(
        contractAddresses.tokenAddress,
        ethers.parseEther(tokenAmount)
      );
      await tx.wait();
    });
  };

  return (
    <div className={styles.swap}>
      <SwapHeader
        activeTab={swapDirection}
        onTabChange={setSwapDirection}
        tokenSymbol={tokenSymbol}
        disabled={false}
      />
      {swapDirection === 'token-to-eth' ? (
        <SwapInput
          key="token-to-eth"
          value={tokenAmount}
          onChange={setTokenAmount}
          placeholder={`${tokenSymbol} → ETH`}
          onClick={swapTokensForETH}
          buttonText="Swap SIMP for ETH"
          isLoading={isLoading}
          generateExpectedOutput={createSwapOutputCalculator(
            poolEthReserve,
            poolTokenReserve,
            tokenSymbol,
            'ETH'
          )}
        />
      ) : (
        <SwapInput
          key="eth-to-token"
          value={ethAmount}
          onChange={setEthAmount}
          placeholder="ETH → SIMP"
          onClick={swapETHForTokens}
          buttonText="Swap ETH for SIMP"
          isLoading={isLoading}
          generateExpectedOutput={createSwapOutputCalculator(
            poolEthReserve,
            poolTokenReserve,
            'ETH',
            tokenSymbol
          )}
        />
      )}
    </div>
  );
};

// DisabledSwap component for when wallet is not connected
interface DisabledSwapProps {
  poolEthReserve?: number;
  poolTokenReserve?: number;
  tokenSymbol?: string;
}

export const DisabledSwap = ({
  poolEthReserve = 0,
  poolTokenReserve = 0,
  tokenSymbol = 'SIMP',
}: DisabledSwapProps = {}) => {
  return (
    <div className={styles.swap}>
      <SwapHeader
        activeTab="token-to-eth"
        onTabChange={() => {}}
        tokenSymbol={tokenSymbol}
        disabled={true}
      />
      <SwapInput
        value=""
        onChange={() => {}}
        placeholder={`${tokenSymbol} → ETH`}
        onClick={() => {}}
        buttonText="Please connect wallet"
        isLoading={false}
        generateExpectedOutput={createSwapOutputCalculator(
          poolEthReserve,
          poolTokenReserve,
          tokenSymbol,
          'ETH'
        )}
        disabled={true}
      />
    </div>
  );
};

export default Swap;
