import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { Token, AMMPool } from '@typechain-types';
import { SwapHeader } from './SwapHeader';
import { SwapInput } from './SwapInput';
import { ConfirmationDialog } from '../shared/ConfirmationDialog';
import { createSwapOutputCalculator } from '../../utils/outputDisplayFormatters';
import { useErrorMessage } from '../../contexts/ErrorMessageContext';
import {
  getFriendlyMessage,
  ERROR_OPERATIONS,
} from '../../utils/errorMessages';
import { calculateMinAmountWithSlippage } from '../../utils/slippageProtection';
import styles from './Swap.module.scss';

export { DisabledSwap } from './DisabledSwap';

interface SwapProps {
  ammContract: AMMPool;
  tokenContract: Token;
  poolEthReserve: bigint;
  poolTokenReserve: bigint;
  onSwapComplete: () => void;
}

export const Swap = ({
  ammContract,
  tokenContract,
  poolEthReserve,
  poolTokenReserve,
  onSwapComplete,
}: SwapProps) => {
  const [ethAmount, setEthAmount] = useState<bigint>(0n);
  const [tokenAmount, setTokenAmount] = useState<bigint>(0n);
  const [isLoading, setIsLoading] = useState(false);
  const [swapDirection, setSwapDirection] = useState<
    'eth-to-token' | 'token-to-eth'
  >('token-to-eth');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [expectedOutput, setExpectedOutput] = useState<bigint>(0n);
  const { setErrorMessage } = useErrorMessage();

  // Clear amounts when direction changes
  useEffect(() => {
    setEthAmount(0n);
    setTokenAmount(0n);
    setShowConfirmDialog(false);
    setExpectedOutput(0n);
  }, [swapDirection]);

  const resetForm = () => {
    setEthAmount(0n);
    setTokenAmount(0n);
    setShowConfirmDialog(false);
    setExpectedOutput(0n);
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

  const showSwapConfirmation = async () => {
    if (
      (swapDirection === 'eth-to-token' && ethAmount === 0n) ||
      (swapDirection === 'token-to-eth' && tokenAmount === 0n)
    ) {
      return;
    }

    setIsLoading(true);
    try {
      let output: bigint;
      if (swapDirection === 'eth-to-token') {
        output = await ammContract.getSwapOutput(ethers.ZeroAddress, ethAmount);
      } else {
        const tokenAddress = await tokenContract.getAddress();
        output = await ammContract.getSwapOutput(tokenAddress, tokenAmount);
      }
      setExpectedOutput(output);
      setShowConfirmDialog(true);
      setIsLoading(false);
    } catch (error) {
      setErrorMessage(getFriendlyMessage(ERROR_OPERATIONS.SWAP, error));
      setIsLoading(false);
    }
  };

  const handleConfirmSwap = async () => {
    setShowConfirmDialog(false);
    if (swapDirection === 'eth-to-token') {
      await swapETHForTokens();
    } else {
      await swapTokensForETH();
    }
  };

  const handleCancelSwap = () => {
    setShowConfirmDialog(false);
    setIsLoading(false);
  };

  const swapETHForTokens = async () => {
    if (ethAmount === 0n) return;

    await executeSwapTransaction(async () => {
      // Get expected output from contract and apply slippage protection
      const expectedOutput = await ammContract.getSwapOutput(
        ethers.ZeroAddress,
        ethAmount
      );
      const minAmountOut = calculateMinAmountWithSlippage(expectedOutput);

      const tx = await ammContract.swap(ethers.ZeroAddress, 0, minAmountOut, {
        value: ethAmount,
      });
      await tx.wait();
    });
  };

  const swapTokensForETH = async () => {
    if (tokenAmount === 0n) return;

    await executeSwapTransaction(async () => {
      await approveTokenSpending(ethers.formatUnits(tokenAmount, 18));
      const tokenAddress = await tokenContract.getAddress();

      // Get expected output from contract and apply slippage protection
      const expectedOutput = await ammContract.getSwapOutput(
        tokenAddress,
        tokenAmount
      );
      const minAmountOut = calculateMinAmountWithSlippage(expectedOutput);

      const tx = await ammContract.swap(
        tokenAddress,
        tokenAmount,
        minAmountOut
      );
      await tx.wait();
    });
  };

  return (
    <>
      <div className={styles.swap}>
        <SwapHeader
          swapDirection={swapDirection}
          onDirectionChange={setSwapDirection}
        />
        {swapDirection === 'token-to-eth' ? (
          <SwapInput
            key="token-to-eth"
            amountWei={tokenAmount}
            onChange={setTokenAmount}
            placeholder="SIMP → ETH"
            onClick={showSwapConfirmation}
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
            amountWei={ethAmount}
            onChange={setEthAmount}
            placeholder="ETH → SIMP"
            onClick={showSwapConfirmation}
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

      <ConfirmationDialog
        isOpen={showConfirmDialog}
        title="Swap Confirmation"
        onConfirm={handleConfirmSwap}
        onCancel={handleCancelSwap}
        confirmText="Proceed"
        cancelText="Cancel"
      >
        <div>
          <p>
            <strong>Swap Details:</strong>
          </p>
          {swapDirection === 'token-to-eth' ? (
            <>
              <p>
                Input: {parseFloat(ethers.formatEther(tokenAmount)).toFixed(4)}{' '}
                SIMP
              </p>
              <p>
                Expected Output:{' '}
                {parseFloat(ethers.formatEther(expectedOutput)).toFixed(4)} ETH
              </p>
            </>
          ) : (
            <>
              <p>
                Input: {parseFloat(ethers.formatEther(ethAmount)).toFixed(4)}{' '}
                ETH
              </p>
              <p>
                Expected Output:{' '}
                {parseFloat(ethers.formatEther(expectedOutput)).toFixed(4)} SIMP
              </p>
            </>
          )}
        </div>
      </ConfirmationDialog>
    </>
  );
};

export default Swap;
