import { LiquidityHeader } from './LiquidityHeader';
import { DisabledAddLiquidity } from './DisabledAddLiquidity';
import styles from './Liquidity.module.scss';

export const DisabledLiquidity = () => {
  const PoolBalances = () => (
    <div className={styles.poolBalances}>
      <p>
        <strong>Pool Reserves:</strong> 0.0000 SIMP / 0.0000 ETH
      </p>
      <p>
        <strong>Your LP Tokens:</strong> 0.0000 ~ 0.00% of pool
      </p>
    </div>
  );

  return (
    <div className={styles.liquidity}>
      <LiquidityHeader activeTab="add" onTabChange={() => {}} disabled={true} />
      <PoolBalances />
      <DisabledAddLiquidity />
    </div>
  );
};
