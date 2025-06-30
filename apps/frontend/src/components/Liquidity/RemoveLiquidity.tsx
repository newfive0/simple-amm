import { useState } from 'react';
import { ethers } from 'ethers';
import { AMMPool } from '@typechain-types';
import { LiquidityBalances } from '../../utils/balances';
import styles from './RemoveLiquidity.module.scss';

interface RemoveLiquidityProps {
  ammContract: AMMPool;
  poolEthReserve: number;
  poolTokenReserve: number;
  lpTokenBalances: LiquidityBalances;
  tokenSymbol: string;
  onLiquidityComplete: () => void;
}

export const RemoveLiquidity = ({
  ammContract,
  poolEthReserve,
  poolTokenReserve,
  lpTokenBalances,
  tokenSymbol,
  onLiquidityComplete,
}: RemoveLiquidityProps) => {
  const [removeLpAmount, setRemoveLpAmount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);

  const removeLiquidity = async () => {
    if (!removeLpAmount || removeLpAmount <= 0) {
      return;
    }

    setIsLoading(true);
    try {
      const removeLiquidityTx = await ammContract.removeLiquidity(
        ethers.parseEther(removeLpAmount.toString())
      );
      await removeLiquidityTx.wait();

      onLiquidityComplete();
      setRemoveLpAmount(0);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Failed to remove liquidity: ${message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateRemoveOutput = () => {
    if (
      !removeLpAmount ||
      removeLpAmount <= 0 ||
      lpTokenBalances.totalLPTokens === 0
    ) {
      return { ethAmount: 0, tokenAmount: 0 };
    }

    const ethAmount =
      (removeLpAmount * poolEthReserve) / lpTokenBalances.totalLPTokens;
    const tokenAmount =
      (removeLpAmount * poolTokenReserve) / lpTokenBalances.totalLPTokens;

    return { ethAmount, tokenAmount };
  };

  const formatReceivingAmount = () => {
    if (
      !removeLpAmount ||
      removeLpAmount <= 0 ||
      lpTokenBalances.totalLPTokens === 0
    ) {
      return '0.0000 SIMP + 0.0000 ETH';
    }
    const output = calculateRemoveOutput();
    return `${output.tokenAmount.toFixed(4)} ${tokenSymbol} + ${output.ethAmount.toFixed(4)} ETH`;
  };

  return (
    <div className={styles.removeLiquidity}>
      <div className={styles.inputField}>
        <label>LP Tokens to Remove</label>
        <div className={styles.inputRow}>
          <input
            type="number"
            step="0.01"
            value={removeLpAmount || ''}
            onChange={(e) => setRemoveLpAmount(parseFloat(e.target.value) || 0)}
            placeholder={`Max: ${lpTokenBalances.userLPTokens.toFixed(4)}`}
            className={styles.inputLeft}
          />
          <div className={styles.expectedOutput}>{formatReceivingAmount()}</div>
        </div>
      </div>
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
    </div>
  );
};
