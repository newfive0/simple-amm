import { useState } from 'react';
import { Token, AMMPool } from '@typechain-types';
import { LiquidityBalances } from '../../utils/balances';
import { TabGroup } from '../shared/TabGroup';
import { AddLiquidity } from './AddLiquidity';
import { RemoveLiquidity } from './RemoveLiquidity';
import { InputField } from './InputField';
import styles from './Liquidity.module.scss';

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

  const tabOptions = [
    { id: 'add', label: 'Add' },
    { id: 'remove', label: 'Remove' },
  ];

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId as 'add' | 'remove');
  };

  return (
    <div className={styles.liquidity}>
      <TabGroup
        title="Liquidity"
        options={tabOptions}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        showLabel={true}
      />
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

// DisabledLiquidity component for when wallet is not connected
export const DisabledLiquidity = () => {
  const tabOptions = [
    { id: 'add', label: 'Add' },
    { id: 'remove', label: 'Remove' },
  ];

  return (
    <div className={styles.liquidity}>
      <TabGroup
        title="Liquidity"
        options={tabOptions}
        activeTab="add"
        onTabChange={() => {}}
        disabled={true}
        showLabel={true}
      />
      <div className={styles.poolBalances}>
        <p>
          <strong>Pool Reserves:</strong> 0.0000 SIMP / 0.0000 ETH
        </p>
      </div>
      <InputField
        label="ETH Amount"
        value={0}
        onChange={() => {}}
        placeholder="Enter ETH amount"
        disabled={true}
      />
      <InputField
        label="SIMP Amount"
        value={0}
        onChange={() => {}}
        placeholder="Enter SIMP amount"
        disabled={true}
      />
      <button onClick={() => {}} disabled={true} className={styles.addButton}>
        Please connect wallet
      </button>
    </div>
  );
};
