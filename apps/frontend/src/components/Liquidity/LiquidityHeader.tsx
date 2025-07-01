import { TabGroup } from '../shared/TabGroup';
import styles from './LiquidityHeader.module.scss';

interface LiquidityHeaderProps {
  activeTab: 'add' | 'remove';
  onTabChange: (tabId: string) => void;
  disabled?: boolean;
}

export const LiquidityHeader = ({
  activeTab,
  onTabChange,
  disabled = false,
}: LiquidityHeaderProps) => {
  const tabOptions = [
    { id: 'add', label: 'Add' },
    { id: 'remove', label: 'Remove' },
  ];

  return (
    <div className={styles.liquidityHeader}>
      <h2 className={styles.title}>Liquidity</h2>
      <TabGroup
        options={tabOptions}
        activeTab={activeTab}
        onTabChange={onTabChange}
        disabled={disabled}
      />
    </div>
  );
};
