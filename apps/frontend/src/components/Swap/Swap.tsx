import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { Token, AMMPool } from '@typechain-types';
import { SwapHeader } from './SwapHeader';
import { InputWithOutput } from '../shared/InputWithOutput';
import { ConfirmationDialog } from '../shared/ConfirmationDialog';
import { createReverseSwapCalculator } from '../../utils/outputDisplayFormatters';
import { useErrorMessage } from '../../contexts/ErrorMessageContext';
import {
  getFriendlyMessage,
  ERROR_OPERATIONS,
} from '../../utils/errorMessages';
import { calculateMinAmountWithSlippage } from '../../utils/slippageProtection';
import { calculateSwapInput } from '../../utils/ammCalculations';
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
  const [desiredOutputAmount, setDesiredOutputAmount] = useState<bigint>(0n);
  const [isLoading, setIsLoading] = useState(false);
  const [swapDirection, setSwapDirection] = useState<
    'eth-to-token' | 'token-to-eth'
  >('eth-to-token');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [calculatedInputAmount, setCalculatedInputAmount] =
    useState<bigint>(0n);
  const { setErrorMessage } = useErrorMessage();

  // Clear amounts when direction changes
  useEffect(() => {
    setDesiredOutputAmount(0n);
    setCalculatedInputAmount(0n);
    setShowConfirmDialog(false);
  }, [swapDirection]);

  const resetForm = () => {
    setDesiredOutputAmount(0n);
    setCalculatedInputAmount(0n);
    setShowConfirmDialog(false);
  };

  const isSwapDisabled = (): boolean => {
    if (desiredOutputAmount === 0n) return true;
    if (poolEthReserve === 0n || poolTokenReserve === 0n) return true;

    // Check if output exceeds available reserves
    const availableReserve =
      swapDirection === 'eth-to-token' ? poolTokenReserve : poolEthReserve;
    if (desiredOutputAmount >= availableReserve) return true;

    // Also check if calculateSwapInput would return 0 (invalid calculation)
    const requiredInput =
      swapDirection === 'eth-to-token'
        ? calculateSwapInput(
            desiredOutputAmount,
            poolEthReserve,
            poolTokenReserve
          )
        : calculateSwapInput(
            desiredOutputAmount,
            poolTokenReserve,
            poolEthReserve
          );

    return requiredInput === 0n;
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
    if (desiredOutputAmount === 0n) {
      return;
    }

    setIsLoading(true);
    try {
      let requiredInput: bigint;
      if (swapDirection === 'eth-to-token') {
        // Want SIMP output -> need ETH input
        requiredInput = calculateSwapInput(
          desiredOutputAmount,
          poolEthReserve,
          poolTokenReserve
        );
      } else {
        // Want ETH output -> need SIMP input
        requiredInput = calculateSwapInput(
          desiredOutputAmount,
          poolTokenReserve,
          poolEthReserve
        );
      }
      setCalculatedInputAmount(requiredInput);
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
    if (calculatedInputAmount === 0n || desiredOutputAmount === 0n) return;

    await executeSwapTransaction(async () => {
      // Apply slippage protection to the desired output
      const minAmountOut = calculateMinAmountWithSlippage(desiredOutputAmount);

      const tx = await ammContract.swap(ethers.ZeroAddress, 0, minAmountOut, {
        value: calculatedInputAmount,
      });
      await tx.wait();
    });
  };

  const swapTokensForETH = async () => {
    if (calculatedInputAmount === 0n || desiredOutputAmount === 0n) return;

    await executeSwapTransaction(async () => {
      await approveTokenSpending(ethers.formatUnits(calculatedInputAmount, 18));
      const tokenAddress = await tokenContract.getAddress();

      // Apply slippage protection to the desired output
      const minAmountOut = calculateMinAmountWithSlippage(desiredOutputAmount);

      const tx = await ammContract.swap(
        tokenAddress,
        calculatedInputAmount,
        minAmountOut
      );
      await tx.wait();
    });
  };

  const renderSwapInput = () => {
    const inputToken = swapDirection === 'eth-to-token' ? 'ETH' : 'SIMP';
    const outputToken = swapDirection === 'eth-to-token' ? 'SIMP' : 'ETH';
    const placeholder = `Get ${outputToken}`;

    return (
      <InputWithOutput
        key={swapDirection}
        amountWei={desiredOutputAmount}
        onChange={setDesiredOutputAmount}
        placeholder={placeholder}
        generateExpectedOutput={createReverseSwapCalculator(
          poolEthReserve,
          poolTokenReserve,
          inputToken,
          outputToken
        )}
      />
    );
  };

  const renderSwapButton = () => {
    const outputToken = swapDirection === 'eth-to-token' ? 'SIMP' : 'ETH';
    const inputToken = swapDirection === 'eth-to-token' ? 'ETH' : 'SIMP';
    const buttonText = `Buy ${outputToken} with ${inputToken}`;

    return (
      <button
        onClick={showSwapConfirmation}
        disabled={isSwapDisabled() || isLoading || desiredOutputAmount === 0n}
        className={styles.swapButton}
      >
        {isLoading ? 'Waiting...' : buttonText}
      </button>
    );
  };

  const renderConfirmationDialog = () => {
    const inputToken = swapDirection === 'eth-to-token' ? 'ETH' : 'SIMP';
    const outputToken = swapDirection === 'eth-to-token' ? 'SIMP' : 'ETH';
    const inputAmount = parseFloat(
      ethers.formatEther(calculatedInputAmount)
    ).toFixed(4);
    const outputAmount = parseFloat(
      ethers.formatEther(desiredOutputAmount)
    ).toFixed(4);

    return (
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
            You'll pay: {inputAmount} {inputToken}
          </p>
          <p>
            You'll receive: {outputAmount} {outputToken}
          </p>
        </div>
      </ConfirmationDialog>
    );
  };

  return (
    <>
      <div className={styles.swap}>
        <SwapHeader
          swapDirection={swapDirection}
          onDirectionChange={setSwapDirection}
        />
        {renderSwapInput()}
        {renderSwapButton()}
      </div>

      {renderConfirmationDialog()}
    </>
  );
};

export default Swap;
