import { useState } from 'react';
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
  contractAddresses: {
    tokenAddress: string;
    ammPoolAddress: string;
  };
  poolEthReserve: number;
  poolTokenReserve: number;
  lpTokenBalances: LiquidityBalances;
  tokenSymbol: string;
  onLiquidityComplete: () => void;
}

export const Liquidity = ({
  ammContract,
  tokenContract,
  contractAddresses,
  poolEthReserve,
  poolTokenReserve,
  lpTokenBalances,
  tokenSymbol,
  onLiquidityComplete,
}: LiquidityProps) => {
  const [activeTab, setActiveTab] = useState<'add' | 'remove'>('add');

  const PoolBalances = () => (
    <div className={styles.poolBalances}>
      <p>
        <strong>Pool Reserves:</strong> {poolTokenReserve.toFixed(4)}{' '}
        {tokenSymbol} + {poolEthReserve.toFixed(4)} ETH
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
          contractAddresses={contractAddresses}
          poolEthReserve={poolEthReserve}
          poolTokenReserve={poolTokenReserve}
          tokenSymbol={tokenSymbol}
          onLiquidityComplete={onLiquidityComplete}
        />
      ) : (
        <RemoveLiquidity
          ammContract={ammContract}
          poolEthReserve={poolEthReserve}
          poolTokenReserve={poolTokenReserve}
          lpTokenBalances={lpTokenBalances}
          tokenSymbol={tokenSymbol}
          onLiquidityComplete={onLiquidityComplete}
        />
      )}
    </div>
  );
};
