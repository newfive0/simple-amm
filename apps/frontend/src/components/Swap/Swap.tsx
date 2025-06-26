import { useState } from 'react';
import { ethers } from 'ethers';
import { Token, AMMPool } from '../../typechain-types';
import styles from './Swap.module.scss';

interface SwapInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  onClick: () => void;
  buttonText: string;
  buttonClass: string;
  isLoading: boolean;
  expectedOutput?: string;
  outputLabel?: string;
}

const SwapInput = ({ 
  label, 
  value, 
  onChange, 
  placeholder, 
  onClick, 
  buttonText, 
  buttonClass,
  isLoading,
  expectedOutput,
  outputLabel
}: SwapInputProps) => (
  <div className={styles.swapInput}>
    <div className={styles.inputField}>
      <label>{label}</label>
      <div className={styles.inputRow}>
        <input
          type="number"
          step="0.01"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoFocus={false}
          className={styles.inputLeft}
        />
        <div className={styles.expectedOutput}>
          {expectedOutput && outputLabel ? `≈ ${expectedOutput} ${outputLabel}` : `≈ 0 ${outputLabel || 'SIMP'}`}
        </div>
      </div>
    </div>
    <button
      onClick={onClick}
      disabled={isLoading || !value}
      className={`${styles.swapButton} ${buttonClass}`}
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
  poolEthBalance: number;
  poolTokenBalance: number;
  tokenSymbol: string;
  onSwapComplete: () => void;
}

export const Swap = ({
  ammContract,
  tokenContract,
  contractAddresses,
  poolEthBalance,
  poolTokenBalance,
  tokenSymbol,
  onSwapComplete,
}: SwapProps) => {
  const [ethAmount, setEthAmount] = useState<string>('');
  const [tokenAmount, setTokenAmount] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [swapDirection, setSwapDirection] = useState<
    'eth-to-token' | 'token-to-eth'
  >('eth-to-token');

  const calculateSwapOutput = (inputAmount: string, isEthToToken: boolean): string => {
    if (!inputAmount || inputAmount === '0') return '';
    
    if (poolEthBalance === 0 || poolTokenBalance === 0) return '';
    
    const input = parseFloat(inputAmount);
    if (isNaN(input)) return '';
    
    // Using constant product formula: x * y = k
    // For swap: newY = k / (x + inputX) = (x * y) / (x + inputX)
    // Output = y - newY = y - (x * y) / (x + inputX) = (y * inputX) / (x + inputX)
    
    if (isEthToToken) {
      // ETH input -> Token output
      const outputTokens = (poolTokenBalance * input) / (poolEthBalance + input);
      return outputTokens.toFixed(6);
    } else {
      // Token input -> ETH output
      const outputEth = (poolEthBalance * input) / (poolTokenBalance + input);
      return outputEth.toFixed(6);
    }
  };

  const handleError = (error: unknown) => {
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
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
      <label>Swap Direction</label>
      <select
        value={swapDirection}
        onChange={(e) => setSwapDirection(e.target.value as 'eth-to-token' | 'token-to-eth')}
      >
        <option value="eth-to-token">ETH → SIMP</option>
        <option value="token-to-eth">SIMP → ETH</option>
      </select>
    </div>
  );


  return (
    <div className={styles.swap}>
      <h2>Swap Tokens</h2>
      <SwapDirectionSelector />
      {swapDirection === 'eth-to-token' ? (
        <SwapInput
          key="eth-to-token"
          label="ETH Amount"
          value={ethAmount}
          onChange={setEthAmount}
          placeholder="Enter ETH amount"
          onClick={swapETHForTokens}
          buttonText="Swap ETH for SIMP"
          buttonClass={styles.ethToToken}
          isLoading={isLoading}
          expectedOutput={calculateSwapOutput(ethAmount, true)}
          outputLabel={tokenSymbol}
        />
      ) : (
        <SwapInput
          key="token-to-eth"
          label="SIMP Amount"
          value={tokenAmount}
          onChange={setTokenAmount}
          placeholder="Enter SIMP amount"
          onClick={swapTokensForETH}
          buttonText="Swap SIMP for ETH"
          buttonClass={styles.tokenToEth}
          isLoading={isLoading}
          expectedOutput={calculateSwapOutput(tokenAmount, false)}
          outputLabel="ETH"
        />
      )}
    </div>
  );
};

export default Swap;
