import { useState } from 'react';
import { ethers } from 'ethers';
import { AMMPool } from '@typechain-types';
import { LiquidityBalances } from '../../utils/balances';
import { InputWithOutput } from '../shared/InputWithOutput';
import { createRemoveLiquidityOutputCalculator } from '../../utils/outputDisplayFormatters';
import { useErrorMessage } from '../../contexts/ErrorMessageContext';
import {
  getFriendlyMessage,
  ERROR_OPERATIONS,
} from '../../utils/errorMessages';
import { calculateMinAmountWithSlippage } from '../../utils/slippageProtection';
import { ConfirmationDialog } from '../shared/ConfirmationDialog';
import styles from './RemoveLiquidity.module.scss';

interface RemoveLiquidityProps {
  ammContract: AMMPool;
  poolEthReserve: bigint;
  poolTokenReserve: bigint;
  lpTokenBalances: LiquidityBalances;
  onLiquidityComplete: () => void;
}

export const RemoveLiquidity = ({
  ammContract,
  poolEthReserve,
  poolTokenReserve,
  lpTokenBalances,
  onLiquidityComplete,
}: RemoveLiquidityProps) => {
  const [removeLpAmountWei, setRemoveLpAmountWei] = useState<bigint>(0n);
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [expectedOutput, setExpectedOutput] = useState<{
    simplest: bigint;
    eth: bigint;
  }>({ simplest: 0n, eth: 0n });
  const { setErrorMessage } = useErrorMessage();

  const showRemoveLiquidityConfirmation = async () => {
    if (removeLpAmountWei === 0n) {
      return;
    }

    setIsLoading(true);
    try {
      const [expectedSimplest, expectedETH] =
        await ammContract.getRemoveLiquidityOutput(removeLpAmountWei);
      setExpectedOutput({ simplest: expectedSimplest, eth: expectedETH });
      setShowConfirmDialog(true);
      setIsLoading(false);
    } catch (error) {
      setErrorMessage(
        getFriendlyMessage(ERROR_OPERATIONS.REMOVE_LIQUIDITY, error)
      );
      setIsLoading(false);
    }
  };

  const handleConfirmRemove = async () => {
    setShowConfirmDialog(false);
    setIsLoading(true);
    try {
      // Apply slippage protection
      const minAmountSimplest = calculateMinAmountWithSlippage(
        expectedOutput.simplest
      );
      const minAmountETH = calculateMinAmountWithSlippage(expectedOutput.eth);

      const removeLiquidityTx = await ammContract.removeLiquidity(
        removeLpAmountWei,
        minAmountSimplest,
        minAmountETH
      );
      await removeLiquidityTx.wait();

      onLiquidityComplete();
      setRemoveLpAmountWei(0n);
      setErrorMessage(''); // Clear any previous errors on success
    } catch (error) {
      setErrorMessage(
        getFriendlyMessage(ERROR_OPERATIONS.REMOVE_LIQUIDITY, error)
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelRemove = () => {
    setShowConfirmDialog(false);
  };

  const generateExpectedOutput = createRemoveLiquidityOutputCalculator(
    poolEthReserve,
    poolTokenReserve,
    ethers.parseUnits(lpTokenBalances.totalLPTokens.toString(), 18)
  );

  const userLPTokensWei = ethers.parseUnits(
    lpTokenBalances.userLPTokens.toString(),
    18
  );

  return (
    <>
      <InputWithOutput
        amountWei={removeLpAmountWei}
        onChange={setRemoveLpAmountWei}
        placeholder="LP Tokens to Remove"
        generateExpectedOutput={generateExpectedOutput}
      />
      <button
        onClick={showRemoveLiquidityConfirmation}
        disabled={
          isLoading ||
          removeLpAmountWei === 0n ||
          removeLpAmountWei > userLPTokensWei
        }
        className={styles.removeButton}
      >
        {isLoading ? 'Waiting...' : 'Remove Liquidity'}
      </button>
      <ConfirmationDialog
        isOpen={showConfirmDialog}
        title="Confirm Remove Liquidity"
        onConfirm={handleConfirmRemove}
        onCancel={handleCancelRemove}
        confirmText="Remove"
        cancelText="Cancel"
      >
        <p>
          Are you sure you want to remove{' '}
          {ethers.formatUnits(removeLpAmountWei, 18)} LP tokens?
        </p>
        <p>You will receive:</p>
        <ul>
          <li>{ethers.formatUnits(expectedOutput.simplest, 18)} SIMP</li>
          <li>{ethers.formatUnits(expectedOutput.eth, 18)} ETH</li>
        </ul>
      </ConfirmationDialog>
    </>
  );
};
