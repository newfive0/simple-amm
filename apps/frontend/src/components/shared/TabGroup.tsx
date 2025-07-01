interface TabOption {
  id: string;
  label: string;
  disabled?: boolean;
}

interface TabGroupProps {
  title: string;
  options: TabOption[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  disabled?: boolean;
  className?: string;
  showLabel?: boolean;
  tabLabel?: string;
}

import styles from './TabGroup.module.scss';

export const TabGroup = ({
  title,
  options,
  activeTab,
  onTabChange,
  disabled = false,
  className = '',
  showLabel = true,
  tabLabel = '',
}: TabGroupProps) => (
  <div className={`${styles.container} ${className}`}>
    <div className={styles.header}>
      {showLabel && <h2 className={styles.title}>{title}</h2>}
      <div className={styles.tabGroup}>
        {tabLabel && <span className={styles.tabLabel}>{tabLabel}</span>}
        <div className={styles.tabs}>
          {options.map((option) => (
            <button
              key={option.id}
              className={`${styles.tab} ${
                activeTab === option.id ? styles.active : ''
              }`}
              onClick={() => !disabled && !option.disabled && onTabChange(option.id)}
              disabled={disabled || option.disabled}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  </div>
);