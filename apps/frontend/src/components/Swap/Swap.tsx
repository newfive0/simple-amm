import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { Token, AMMPool } from '@typechain-types';
import { TabGroup } from '../shared/TabGroup';
import { SwapInput } from './SwapInput';
import { createSwapOutputCalculator } from '../../utils/expectedOutputCalculators';
import { useErrorMessage } from '../../contexts/ErrorMessageContext';
import {
  getFriendlyMessage,
  ERROR_OPERATIONS,
} from '../../utils/errorMessages';
import styles from './Swap.module.scss';

export { DisabledSwap } from './DisabledSwap';

interface SwapProps {
  ammContract: AMMPool;
  tokenContract: Token;
  poolEthReserve: number;
  poolTokenReserve: number;
  onSwapComplete: () => void;
}

export const Swap = ({
  ammContract,
  tokenContract,
  poolEthReserve,
  poolTokenReserve,
  onSwapComplete,
}: SwapProps) => {
  const [ethAmount, setEthAmount] = useState<string>('');
  const [tokenAmount, setTokenAmount] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [swapDirection, setSwapDirection] = useState<
    'eth-to-token' | 'token-to-eth'
  >('token-to-eth');
  const { setErrorMessage } = useErrorMessage();

  // Clear amounts when direction changes
  useEffect(() => {
    setEthAmount('');
    setTokenAmount('');
  }, [swapDirection]);

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
      setErrorMessage(''); // Clear any previous errors on success
    } catch (error) {
      setErrorMessage(getFriendlyMessage(ERROR_OPERATIONS.SWAP, error));
    } finally {
      setIsLoading(false);
    }
  };

  const approveTokenSpending = async (amount: string) => {
    const ammPoolAddress = await ammContract.getAddress();
    const approveTx = await tokenContract.approve(
      ammPoolAddress,
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
      const tokenAddress = await tokenContract.getAddress();
      const tx = await ammContract.swap(
        tokenAddress,
        ethers.parseEther(tokenAmount)
      );
      await tx.wait();
    });
  };

  const tabOptions = [
    { id: 'token-to-eth', label: 'ETH' },
    { id: 'eth-to-token', label: 'SIMP' },
  ];

  return (
    <div className={styles.swap}>
      <div className={styles.header}>
        <h2 className={styles.title}>Swap</h2>
        <TabGroup
          options={tabOptions}
          activeTab={swapDirection}
          onTabChange={setSwapDirection as (tabId: string) => void}
          disabled={false}
          tabLabel="Receive"
        />
      </div>
      {swapDirection === 'token-to-eth' ? (
        <SwapInput
          key="token-to-eth"
          value={tokenAmount}
          onChange={setTokenAmount}
          placeholder="SIMP → ETH"
          onClick={swapTokensForETH}
          buttonText="Swap SIMP for ETH"
          isLoading={isLoading}
          generateExpectedOutput={createSwapOutputCalculator(
            poolEthReserve,
            poolTokenReserve,
            'SIMP',
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
            'SIMP'
          )}
        />
      )}
    </div>
  );
};

export default Swap;
