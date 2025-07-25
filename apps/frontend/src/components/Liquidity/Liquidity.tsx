import { useState } from 'react';
import { formatEther, formatUnits } from 'ethers';
import { Token, AMMPool } from '@typechain-types';
import { LiquidityBalances } from '../../utils/balances';
import { LiquidityHeader } from './LiquidityHeader';
import { AddLiquidity } from './AddLiquidity';
import { RemoveLiquidity } from './RemoveLiquidity';
import styles from './Liquidity.module.scss';

export { DisabledLiquidity } from './DisabledLiquidity';

interface LiquidityProps {
  ammContract: AMMPool;
  tokenContract: Token;
  poolEthReserve: bigint;
  poolTokenReserve: bigint;
  lpTokenBalances: LiquidityBalances;
  onLiquidityComplete: () => void;
}

export const Liquidity = ({
  ammContract,
  tokenContract,
  poolEthReserve,
  poolTokenReserve,
  lpTokenBalances,
  onLiquidityComplete,
}: LiquidityProps) => {
  const [activeTab, setActiveTab] = useState<'add' | 'remove'>('add');

  const PoolBalances = () => (
    <div className={styles.poolBalances}>
      <p>
        <strong>Pool Reserves:</strong>{' '}
        {parseFloat(formatUnits(poolTokenReserve, 18)).toFixed(4)} SIMP +{' '}
        {parseFloat(formatEther(poolEthReserve)).toFixed(4)} ETH
      </p>
      {lpTokenBalances.userLPTokens > 0 && (
        <p>
          <strong>Your LP Tokens:</strong>{' '}
          {lpTokenBalances.userLPTokens.toFixed(4)} ~{' '}
          {lpTokenBalances.poolOwnershipPercentage.toFixed(2)}% of pool
        </p>
      )}
    </div>
  );

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId as 'add' | 'remove');
  };

  return (
    <div className={styles.liquidity}>
      <LiquidityHeader activeTab={activeTab} onTabChange={handleTabChange} />
      <PoolBalances />
      {activeTab === 'add' ? (
        <AddLiquidity
          ammContract={ammContract}
          tokenContract={tokenContract}
          poolEthReserve={poolEthReserve}
          poolTokenReserve={poolTokenReserve}
          onLiquidityComplete={onLiquidityComplete}
        />
      ) : (
        <RemoveLiquidity
          ammContract={ammContract}
          poolEthReserve={poolEthReserve}
          poolTokenReserve={poolTokenReserve}
          lpTokenBalances={lpTokenBalances}
          onLiquidityComplete={onLiquidityComplete}
        />
      )}
    </div>
  );
};
