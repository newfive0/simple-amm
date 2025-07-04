import { useState } from 'react';
import { ethers } from 'ethers';
import { AMMPool } from '@typechain-types';
import { LiquidityBalances } from '../../utils/balances';
import { InputWithOutput } from '../shared/InputWithOutput';
import { createRemoveLiquidityOutputCalculator } from '../../utils/expectedOutputCalculators';
import { useErrorMessage } from '../../contexts/ErrorMessageContext';
import {
  getFriendlyMessage,
  ERROR_OPERATIONS,
} from '../../utils/errorMessages';
import { calculateMinAmountWithSlippage } from '../../utils/slippageProtection';
import styles from './RemoveLiquidity.module.scss';

interface RemoveLiquidityProps {
  ammContract: AMMPool;
  poolEthReserve: number;
  poolTokenReserve: number;
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
  const [removeLpAmount, setRemoveLpAmount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const { setErrorMessage } = useErrorMessage();

  const removeLiquidity = async () => {
    if (!removeLpAmount || removeLpAmount <= 0) {
      return;
    }

    setIsLoading(true);
    try {
      // Get expected amounts from contract and apply slippage protection
      const [expectedSimplest, expectedETH] =
        await ammContract.getRemoveLiquidityOutput(
          ethers.parseEther(removeLpAmount.toString())
        );
      const minAmountSimplest =
        calculateMinAmountWithSlippage(expectedSimplest);
      const minAmountETH = calculateMinAmountWithSlippage(expectedETH);

      const removeLiquidityTx = await ammContract.removeLiquidity(
        ethers.parseEther(removeLpAmount.toString()),
        minAmountSimplest,
        minAmountETH
      );
      await removeLiquidityTx.wait();

      onLiquidityComplete();
      setRemoveLpAmount(0);
      setErrorMessage(''); // Clear any previous errors on success
    } catch (error) {
      setErrorMessage(
        getFriendlyMessage(ERROR_OPERATIONS.REMOVE_LIQUIDITY, error)
      );
    } finally {
      setIsLoading(false);
    }
  };

  const generateExpectedOutput = createRemoveLiquidityOutputCalculator(
    poolEthReserve,
    poolTokenReserve,
    lpTokenBalances.totalLPTokens
  );

  return (
    <>
      <InputWithOutput
        value={removeLpAmount === 0 ? '' : removeLpAmount.toString()}
        onChange={(value) => {
          if (value === '') {
            setRemoveLpAmount(0);
            return;
          }
          const numValue = Number(value);
          if (isNaN(numValue)) {
            return;
          }
          setRemoveLpAmount(numValue);
        }}
        placeholder="LP Tokens to Remove"
        generateExpectedOutput={generateExpectedOutput}
      />
      <button
        onClick={removeLiquidity}
        disabled={
          isLoading ||
          !removeLpAmount ||
          removeLpAmount <= 0 ||
          removeLpAmount > lpTokenBalances.userLPTokens
        }
        className={styles.removeButton}
      >
        {isLoading ? 'Waiting...' : 'Remove Liquidity'}
      </button>
    </>
  );
};
