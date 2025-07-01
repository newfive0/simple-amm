import { useState } from 'react';
import { ethers } from 'ethers';
import { Token, AMMPool } from '@typechain-types';
import { TabGroup } from '../shared/TabGroup';
import styles from './Swap.module.scss';

interface SwapInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  onClick: () => void;
  buttonText: string;
  isLoading: boolean;
  expectedOutput?: string;
  outputLabel?: string;
  disabled?: boolean;
  exchangeRate?: string;
}

const SwapInput = ({
  label,
  value,
  onChange,
  placeholder,
  onClick,
  buttonText,
  isLoading,
  expectedOutput,
  outputLabel,
  disabled = false,
  exchangeRate,
}: SwapInputProps) => (
  <div className={styles.swapInput}>
    <div className={styles.inputField}>
      <label>{label}</label>
      <div className={styles.inputRow}>
        <input
          type="number"
          step="0.01"
          value={value}
          onChange={(e) => !disabled && onChange(e.target.value)}
          placeholder={placeholder}
          autoFocus={false}
          className={styles.inputLeft}
          disabled={disabled}
        />
        <div className={styles.expectedOutput}>
          {expectedOutput && outputLabel
            ? `≈ ${expectedOutput} ${outputLabel}`
            : exchangeRate || `≈ 0 ${outputLabel || 'SIMP'}`}
        </div>
      </div>
    </div>
    <button
      onClick={onClick}
      disabled={disabled || isLoading || !value}
      className={styles.swapButton}
    >
      {isLoading ? 'Waiting...' : buttonText}
    </button>
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

  const calculateSwapOutput = (
    inputAmount: string,
    isEthToToken: boolean
  ): string => {
    if (!inputAmount || inputAmount === '0') return '';

    if (poolEthReserve === 0 || poolTokenReserve === 0) return '';

    const input = parseFloat(inputAmount);
    if (isNaN(input)) return '';

    // Using constant product formula: x * y = k
    // For swap: newY = k / (x + inputX) = (x * y) / (x + inputX)
    // Output = y - newY = y - (x * y) / (x + inputX) = (y * inputX) / (x + inputX)

    if (isEthToToken) {
      // ETH input -> Token output
      const outputTokens =
        (poolTokenReserve * input) / (poolEthReserve + input);
      return outputTokens.toFixed(6);
    } else {
      // Token input -> ETH output
      const outputEth = (poolEthReserve * input) / (poolTokenReserve + input);
      return outputEth.toFixed(6);
    }
  };

  const getExchangeRate = (isEthToToken: boolean): string => {
    if (poolEthReserve === 0 || poolTokenReserve === 0) return '';

    if (isEthToToken) {
      // Show 1 ETH = x SIMP
      const rate = poolTokenReserve / poolEthReserve;
      return `1 ETH ≈ ${rate.toFixed(4)} ${tokenSymbol}`;
    } else {
      // Show 1 SIMP = x ETH
      const rate = poolEthReserve / poolTokenReserve;
      return `1 ${tokenSymbol} ≈ ${rate.toFixed(6)} ETH`;
    }
  };

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

  const tabOptions = [
    { id: 'eth-to-token', label: 'ETH' },
    { id: 'token-to-eth', label: tokenSymbol },
  ];

  const handleTabChange = (tabId: string) => {
    setSwapDirection(tabId as 'eth-to-token' | 'token-to-eth');
  };

  return (
    <div className={styles.swap}>
      <TabGroup
        title="Swap"
        options={tabOptions}
        activeTab={swapDirection}
        onTabChange={handleTabChange}
        showLabel={true}
        tabLabel="Receive:"
      />
      {swapDirection === 'eth-to-token' ? (
        <SwapInput
          key="eth-to-token"
          label="ETH Amount"
          value={ethAmount}
          onChange={setEthAmount}
          placeholder="ETH → SIMP"
          onClick={swapETHForTokens}
          buttonText="Swap ETH for SIMP"
          isLoading={isLoading}
          expectedOutput={calculateSwapOutput(ethAmount, true)}
          outputLabel={tokenSymbol}
          exchangeRate={getExchangeRate(true)}
        />
      ) : (
        <SwapInput
          key="token-to-eth"
          label="SIMP Amount"
          value={tokenAmount}
          onChange={setTokenAmount}
          placeholder="SIMP → ETH"
          onClick={swapTokensForETH}
          buttonText="Swap SIMP for ETH"
          isLoading={isLoading}
          expectedOutput={calculateSwapOutput(tokenAmount, false)}
          outputLabel="ETH"
          exchangeRate={getExchangeRate(false)}
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
  const getExchangeRate = (): string => {
    if (poolEthReserve === 0 || poolTokenReserve === 0) return '';
    const rate = poolEthReserve / poolTokenReserve;
    return `1 ${tokenSymbol} ≈ ${rate.toFixed(6)} ETH`;
  };

  const tabOptions = [
    { id: 'eth-to-token', label: 'ETH' },
    { id: 'token-to-eth', label: tokenSymbol },
  ];

  return (
    <div className={styles.swap}>
      <TabGroup
        title="Swap"
        options={tabOptions}
        activeTab="token-to-eth"
        onTabChange={() => {}}
        disabled={true}
        showLabel={true}
        tabLabel="Receive:"
      />
      <SwapInput
        label="SIMP Amount"
        value=""
        onChange={() => {}}
        placeholder="SIMP → ETH"
        onClick={() => {}}
        buttonText="Please connect wallet"
        isLoading={false}
        expectedOutput=""
        outputLabel="ETH"
        disabled={true}
        exchangeRate={getExchangeRate()}
      />
    </div>
  );
};

export default Swap;
