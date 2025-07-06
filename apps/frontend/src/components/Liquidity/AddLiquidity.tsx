import { useState } from 'react';
import { ethers } from 'ethers';
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
      // Get expected LP tokens from contract FIRST
      const expectedLPTokens = await ammContract.getLiquidityOutput(
        liquidityTokenAmount,
        liquidityEthAmount
      );

      // Show alert with expected output and wait for user confirmation
      const ethAmount = ethers.formatEther(liquidityEthAmount);
      const simpAmount = ethers.formatUnits(liquidityTokenAmount, 18);
      const expectedLP = ethers.formatUnits(expectedLPTokens, 18);

      const confirmed = window.confirm(
        `Expected Output:\n` +
          `ETH: ${Number(ethAmount).toFixed(4)}\n` +
          `SIMP: ${Number(simpAmount).toFixed(4)}\n` +
          `Expected LP Tokens: ${Number(expectedLP).toFixed(4)}\n\n` +
          `Do you want to proceed?`
      );

      if (!confirmed) {
        setIsLoading(false);
        return;
      }

      // After user confirmation, proceed with approval
      await approveTokenSpending(liquidityTokenAmount);

      // Apply slippage protection using the previously fetched expected amount
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
          amountWei={liquidityEthAmount}
          onChange={handleEthAmountChange}
          placeholder="Enter ETH amount"
        />
        <LiquidityInput
          amountWei={liquidityTokenAmount}
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
