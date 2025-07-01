interface TabOption {
  id: string;
  label: string;
  disabled?: boolean;
}

interface TabGroupProps {
  options: TabOption[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  disabled?: boolean;
  className?: string;
  tabLabel?: string;
}

import styles from './TabGroup.module.scss';

export const TabGroup = ({
  options,
  activeTab,
  onTabChange,
  disabled = false,
  className = '',
  tabLabel = '',
}: TabGroupProps) => (
  <div className={`${styles.tabGroup} ${className}`}>
    {tabLabel && <span className={styles.tabLabel}>{tabLabel}</span>}
    <div className={styles.tabs}>
      {options.map((option) => (
        <button
          key={option.id}
          className={`${styles.tab} ${
            activeTab === option.id ? styles.active : ''
          }`}
          onClick={() =>
            !disabled && !option.disabled && onTabChange(option.id)
          }
          disabled={disabled || option.disabled}
        >
          {option.label}
        </button>
      ))}
    </div>
  </div>
);
