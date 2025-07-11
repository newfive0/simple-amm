import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { Token, AMMPool } from '@typechain-types';
import { SwapHeader } from './SwapHeader';
import { TokenAmountInputPair } from '../shared';
import { ConfirmationDialog } from '../shared/ConfirmationDialog';
import {
  calculateSwapOutput,
  calculateSwapInput,
} from '../../utils/ammCalculations';
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
  >('eth-to-token');
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

  const isSwapDisabled = (): boolean => {
    if (swapDirection === 'eth-to-token' && ethAmount === 0n) return true;
    if (swapDirection === 'token-to-eth' && tokenAmount === 0n) return true;
    if (poolEthReserve === 0n || poolTokenReserve === 0n) return true;
    return false;
  };

  const isSwapExceedsLiquidity = (): boolean => {
    if (swapDirection === 'eth-to-token') {
      // Check if SIMP output exceeds available reserves
      return tokenAmount >= poolTokenReserve;
    } else {
      // Check if ETH output exceeds available reserves
      return ethAmount >= poolEthReserve;
    }
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

  const calculateSwapOutputAmount = (
    inputAmount: bigint,
    direction: 'eth-to-token' | 'token-to-eth'
  ): bigint => {
    if (
      inputAmount === 0n ||
      poolEthReserve === 0n ||
      poolTokenReserve === 0n
    ) {
      return 0n;
    }

    if (direction === 'eth-to-token') {
      return calculateSwapOutput(inputAmount, poolEthReserve, poolTokenReserve);
    } else {
      return calculateSwapOutput(inputAmount, poolTokenReserve, poolEthReserve);
    }
  };

  const calculateSwapInputAmount = (
    outputAmount: bigint,
    direction: 'eth-to-token' | 'token-to-eth'
  ): bigint => {
    if (
      outputAmount === 0n ||
      poolEthReserve === 0n ||
      poolTokenReserve === 0n
    ) {
      return 0n;
    }

    if (direction === 'eth-to-token') {
      return calculateSwapInput(outputAmount, poolEthReserve, poolTokenReserve);
    } else {
      return calculateSwapInput(outputAmount, poolTokenReserve, poolEthReserve);
    }
  };

  const handleEthAmountChange = (amount: bigint) => {
    setEthAmount(amount);
    if (swapDirection === 'eth-to-token') {
      // ETH input -> calculate SIMP output
      const output = calculateSwapOutputAmount(amount, 'eth-to-token');
      setTokenAmount(output);
    } else {
      // token-to-eth: ETH is output, so calculate required SIMP input
      const input = calculateSwapInputAmount(amount, 'token-to-eth');
      setTokenAmount(input);
    }
  };

  const handleTokenAmountChange = (amount: bigint) => {
    setTokenAmount(amount);
    if (swapDirection === 'token-to-eth') {
      // SIMP input -> calculate ETH output
      const output = calculateSwapOutputAmount(amount, 'token-to-eth');
      setEthAmount(output);
    } else {
      // eth-to-token: SIMP is output, so calculate required ETH input
      const input = calculateSwapInputAmount(amount, 'eth-to-token');
      setEthAmount(input);
    }
  };

  const renderSwapInput = () => {
    const ethPlaceholder =
      swapDirection === 'eth-to-token' ? 'Sell ETH' : 'Buy ETH';
    const tokenPlaceholder =
      swapDirection === 'eth-to-token' ? 'Buy SIMP' : 'Sell SIMP';

    return (
      <TokenAmountInputPair
        key={swapDirection}
        ethAmount={ethAmount}
        tokenAmount={tokenAmount}
        onEthAmountChange={handleEthAmountChange}
        onTokenAmountChange={handleTokenAmountChange}
        ethPlaceholder={ethPlaceholder}
        tokenPlaceholder={tokenPlaceholder}
        reversed={swapDirection === 'token-to-eth'}
      />
    );
  };

  const renderSwapButton = () => {
    const outputToken = swapDirection === 'eth-to-token' ? 'SIMP' : 'ETH';
    const inputToken = swapDirection === 'eth-to-token' ? 'ETH' : 'SIMP';
    const currentAmount =
      swapDirection === 'eth-to-token' ? ethAmount : tokenAmount;

    let buttonText = `Swap ${inputToken} → ${outputToken}`;
    let buttonDisabled = isSwapDisabled() || isLoading || currentAmount === 0n;

    if (isSwapExceedsLiquidity()) {
      buttonText = 'Exceeds Available Liquidity';
      buttonDisabled = true;
    }

    return (
      <button
        onClick={showSwapConfirmation}
        disabled={buttonDisabled}
        className={styles.swapButton}
      >
        {isLoading ? 'Waiting...' : buttonText}
      </button>
    );
  };

  const renderConfirmationDialog = () => {
    const inputToken = swapDirection === 'eth-to-token' ? 'ETH' : 'SIMP';
    const outputToken = swapDirection === 'eth-to-token' ? 'SIMP' : 'ETH';
    const currentAmount =
      swapDirection === 'eth-to-token' ? ethAmount : tokenAmount;
    const inputAmountFormatted = parseFloat(
      ethers.formatEther(currentAmount)
    ).toFixed(4);
    const outputAmountFormatted = parseFloat(
      ethers.formatEther(expectedOutput)
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
            You'll pay: {inputAmountFormatted} {inputToken}
          </p>
          <p>
            You'll receive: {outputAmountFormatted} {outputToken}
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
