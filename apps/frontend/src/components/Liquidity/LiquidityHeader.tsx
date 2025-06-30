import styles from './LiquidityHeader.module.scss';

interface LiquidityHeaderProps {
  activeTab?: 'add' | 'remove';
  onTabChange?: (tab: 'add' | 'remove') => void;
  disabled?: boolean;
}

export const LiquidityHeader = ({
  activeTab = 'add',
  onTabChange,
  disabled = false,
}: LiquidityHeaderProps) => (
  <div className={styles.header}>
    <h2 className={styles.title}>Liquidity</h2>
    <div className={styles.tabs}>
      <button
        className={`${styles.tab} ${activeTab === 'add' ? styles.active : ''}`}
        onClick={() => onTabChange?.('add')}
        disabled={disabled}
      >
        Add
      </button>
      <button
        className={`${styles.tab} ${activeTab === 'remove' ? styles.active : ''}`}
        onClick={() => onTabChange?.('remove')}
        disabled={disabled}
      >
        Remove
      </button>
    </div>
  </div>
);
