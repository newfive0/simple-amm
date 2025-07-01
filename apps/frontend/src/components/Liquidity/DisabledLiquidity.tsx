import { useState } from 'react';
import { LiquidityHeader } from './LiquidityHeader';
import { DisabledAddLiquidity } from './DisabledAddLiquidity';
import { DisabledRemoveLiquidity } from './DisabledRemoveLiquidity';
import styles from './Liquidity.module.scss';

interface DisabledLiquidityProps {
  tokenSymbol?: string;
}

export const DisabledLiquidity = ({
  tokenSymbol = 'SIMP',
}: DisabledLiquidityProps) => {
  const [activeTab, setActiveTab] = useState<'add' | 'remove'>('add');

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId as 'add' | 'remove');
  };

  const PoolBalances = () => (
    <div className={styles.poolBalances}>
      <p>
        <strong>Pool Reserves:</strong> 0.0000 {tokenSymbol} / 0.0000 ETH
      </p>
      <p>
        <strong>Your LP Tokens:</strong> 0.0000 ~ 0.00% of pool
      </p>
    </div>
  );

  return (
    <div className={styles.liquidity}>
      <LiquidityHeader
        activeTab={activeTab}
        onTabChange={handleTabChange}
        disabled={true}
      />
      <PoolBalances />
      {activeTab === 'add' ? (
        <DisabledAddLiquidity tokenSymbol={tokenSymbol} />
      ) : (
        <DisabledRemoveLiquidity tokenSymbol={tokenSymbol} />
      )}
    </div>
  );
};
