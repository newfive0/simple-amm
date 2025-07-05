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
  const { setErrorMessage } = useErrorMessage();

  const removeLiquidity = async () => {
    if (removeLpAmountWei === 0n) {
      return;
    }

    setIsLoading(true);
    try {
      // Get expected amounts from contract and apply slippage protection
      const [expectedSimplest, expectedETH] =
        await ammContract.getRemoveLiquidityOutput(removeLpAmountWei);
      const minAmountSimplest =
        calculateMinAmountWithSlippage(expectedSimplest);
      const minAmountETH = calculateMinAmountWithSlippage(expectedETH);

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
        onClick={removeLiquidity}
        disabled={
          isLoading ||
          removeLpAmountWei === 0n ||
          removeLpAmountWei > userLPTokensWei
        }
        className={styles.removeButton}
      >
        {isLoading ? 'Waiting...' : 'Remove Liquidity'}
      </button>
    </>
  );
};
