import { useState } from 'react';
import { ethers } from 'ethers';
import { AMMPool } from '@typechain-types';
import { LiquidityBalances } from '../../utils/balances';
import { InputField } from './InputField';
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

  return (
    <>
      <InputField
        label="LP Tokens to Remove"
        value={removeLpAmount}
        onChange={setRemoveLpAmount}
        placeholder={`Max: ${lpTokenBalances.userLPTokens.toFixed(4)}`}
      />
      <button
        type="button"
        onClick={() => setRemoveLpAmount(lpTokenBalances.userLPTokens)}
        className={styles.maxButton}
      >
        Max
      </button>
      {removeLpAmount > 0 && lpTokenBalances.totalLPTokens > 0 && (
        <div className={styles.removeOutput}>
          <p>You will receive:</p>
          <p>{calculateRemoveOutput().ethAmount.toFixed(4)} ETH</p>
          <p>
            {calculateRemoveOutput().tokenAmount.toFixed(4)} {tokenSymbol}
          </p>
        </div>
      )}
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
