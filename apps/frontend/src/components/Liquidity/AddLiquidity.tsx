import { useState } from 'react';
import { Token, AMMPool } from '@typechain-types';
import { LiquidityInput } from './LiquidityInput';
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
  const { setErrorMessage } = useErrorMessage();

  const calculateCorrespondingAmount = (
    amount: bigint,
    isEthInput: boolean
  ): bigint => {
    if (amount === 0n) {
      return 0n;
    }

    if (isEthInput) {
      // Calculate required token amount based on ETH input
      return calculateRequiredTokenAmount(
        amount,
        poolEthReserve,
        poolTokenReserve
      );
    } else {
      // Calculate required ETH amount based on token input
      return calculateRequiredEthAmount(
        amount,
        poolEthReserve,
        poolTokenReserve
      );
    }
  };

  const handleEthAmountChange = (valueWei: bigint) => {
    setLiquidityEthAmount(valueWei);

    const poolHasLiquidity = poolEthReserve > 0n && poolTokenReserve > 0n;

    // If pool has liquidity, always update the other field (including clearing it)
    if (poolHasLiquidity) {
      const correspondingTokenAmount = calculateCorrespondingAmount(
        valueWei,
        true
      );
      setLiquidityTokenAmount(correspondingTokenAmount);
    }
  };

  const handleTokenAmountChange = (valueWei: bigint) => {
    setLiquidityTokenAmount(valueWei);

    const poolHasLiquidity = poolEthReserve > 0n && poolTokenReserve > 0n;

    // If pool has liquidity, always update the other field (including clearing it)
    if (poolHasLiquidity) {
      const correspondingEthAmount = calculateCorrespondingAmount(
        valueWei,
        false
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
      await approveTokenSpending(liquidityTokenAmount);

      // Get expected LP tokens from contract and apply slippage protection
      const expectedLPTokens = await ammContract.getLiquidityOutput(
        liquidityTokenAmount,
        liquidityEthAmount
      );
      const minLPTokens = calculateMinAmountWithSlippage(expectedLPTokens);

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

  return (
    <>
      <div className={styles.inputRow}>
        <LiquidityInput
          valueWei={liquidityEthAmount}
          onChange={handleEthAmountChange}
          placeholder="Enter ETH amount"
        />
        <LiquidityInput
          valueWei={liquidityTokenAmount}
          onChange={handleTokenAmountChange}
          placeholder="Enter SIMP amount"
        />
      </div>
      <button
        onClick={addLiquidity}
        disabled={
          isLoading || liquidityEthAmount === 0n || liquidityTokenAmount === 0n
        }
        className={styles.addButton}
      >
        {isLoading ? 'Waiting...' : 'Add Liquidity'}
      </button>
    </>
  );
};
