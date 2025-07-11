import { useState } from 'react';
import { ethers } from 'ethers';
import { Token, AMMPool } from '@typechain-types';
import { TokenAmountInputPair } from '../shared';
import { ConfirmationDialog } from '../shared/ConfirmationDialog';
import { useErrorMessage } from '../../contexts/ErrorMessageContext';
import {
  getFriendlyMessage,
  ERROR_OPERATIONS,
} from '../../utils/errorMessages';
import { calculateMinAmountWithSlippage } from '../../utils/slippageProtection';
import {
  calculateRequiredTokenAmount,
  calculateRequiredEthAmount,
} from '../../utils/ammCalculations';
import styles from './AddLiquidity.module.scss';

interface AddLiquidityProps {
  ammContract: AMMPool;
  tokenContract: Token;
  poolEthReserve: bigint;
  poolTokenReserve: bigint;
  onLiquidityComplete: () => void;
}

export const AddLiquidity = ({
  ammContract,
  tokenContract,
  poolEthReserve,
  poolTokenReserve,
  onLiquidityComplete,
}: AddLiquidityProps) => {
  const [liquidityEthAmount, setLiquidityEthAmount] = useState<bigint>(0n);
  const [liquidityTokenAmount, setLiquidityTokenAmount] = useState<bigint>(0n);
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [expectedLPTokens, setExpectedLPTokens] = useState<bigint>(0n);
  const { setErrorMessage } = useErrorMessage();

  const handleEthAmountChange = (amountWei: bigint) => {
    setLiquidityEthAmount(amountWei);

    const poolHasLiquidity = poolEthReserve > 0n && poolTokenReserve > 0n;

    // If pool has liquidity, always update the other field (including clearing it)
    if (poolHasLiquidity) {
      const correspondingTokenAmount = calculateRequiredTokenAmount(
        amountWei,
        poolEthReserve,
        poolTokenReserve
      );
      setLiquidityTokenAmount(correspondingTokenAmount);
    }
  };

  const handleTokenAmountChange = (amountWei: bigint) => {
    setLiquidityTokenAmount(amountWei);

    const poolHasLiquidity = poolEthReserve > 0n && poolTokenReserve > 0n;

    // If pool has liquidity, always update the other field (including clearing it)
    if (poolHasLiquidity) {
      const correspondingEthAmount = calculateRequiredEthAmount(
        amountWei,
        poolEthReserve,
        poolTokenReserve
      );
      setLiquidityEthAmount(correspondingEthAmount);
    }
  };

  const resetForm = () => {
    setLiquidityEthAmount(0n);
    setLiquidityTokenAmount(0n);
  };

  const approveTokenSpending = async (amount: bigint) => {
    const ammPoolAddress = await ammContract.getAddress();
    const approveTx = await tokenContract.approve(ammPoolAddress, amount);
    await approveTx.wait();
  };

  const addLiquidity = async () => {
    if (liquidityEthAmount === 0n || liquidityTokenAmount === 0n) {
      return;
    }

    setIsLoading(true);
    try {
      // Get expected LP tokens from contract and show confirmation dialog
      const expectedLP = await ammContract.getLiquidityOutput(
        liquidityTokenAmount,
        liquidityEthAmount
      );
      setExpectedLPTokens(expectedLP);
      setShowConfirmDialog(true);
      setIsLoading(false);
    } catch (error) {
      setErrorMessage(
        getFriendlyMessage(ERROR_OPERATIONS.ADD_LIQUIDITY, error)
      );
      setIsLoading(false);
    }
  };

  const handleConfirmAddLiquidity = async () => {
    setShowConfirmDialog(false);
    setIsLoading(true);

    try {
      const minLPTokens = calculateMinAmountWithSlippage(expectedLPTokens);

      // Proceed with approval and add liquidity
      await approveTokenSpending(liquidityTokenAmount);

      const addLiquidityTx = await ammContract.addLiquidity(
        liquidityTokenAmount,
        minLPTokens,
        { value: liquidityEthAmount }
      );
      await addLiquidityTx.wait();

      onLiquidityComplete();
      resetForm();
      setErrorMessage(''); // Clear any previous errors on success
    } catch (error) {
      setErrorMessage(
        getFriendlyMessage(ERROR_OPERATIONS.ADD_LIQUIDITY, error)
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelAddLiquidity = () => {
    setShowConfirmDialog(false);
    setIsLoading(false);
  };

  return (
    <>
      <TokenAmountInputPair
        ethAmount={liquidityEthAmount}
        tokenAmount={liquidityTokenAmount}
        onEthAmountChange={handleEthAmountChange}
        onTokenAmountChange={handleTokenAmountChange}
      />
      <button
        onClick={addLiquidity}
        disabled={
          isLoading || liquidityEthAmount === 0n || liquidityTokenAmount === 0n
        }
        className={styles.addButton}
      >
        {isLoading ? 'Waiting...' : 'Add Liquidity'}
      </button>

      <ConfirmationDialog
        isOpen={showConfirmDialog}
        title="Add Liquidity Confirmation"
        onConfirm={handleConfirmAddLiquidity}
        onCancel={handleCancelAddLiquidity}
        confirmText="Proceed"
        cancelText="Cancel"
      >
        <div>
          <p>
            <strong>Expected Output:</strong>
          </p>
          <p>
            ETH: {parseFloat(ethers.formatEther(liquidityEthAmount)).toFixed(4)}
          </p>
          <p>
            SIMP:{' '}
            {parseFloat(ethers.formatEther(liquidityTokenAmount)).toFixed(4)}
          </p>
          <p>
            Expected LP Tokens:{' '}
            {parseFloat(ethers.formatEther(expectedLPTokens)).toFixed(4)}
          </p>
        </div>
      </ConfirmationDialog>
    </>
  );
};
