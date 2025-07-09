import styles from './Swap.module.scss';

interface SwitchDirectionButtonProps {
  onClick: () => void;
  disabled?: boolean;
}

export const SwitchDirectionButton = ({
  onClick,
  disabled = false,
}: SwitchDirectionButtonProps) => {
  return (
    <button
      className={styles.switchButton}
      onClick={onClick}
      type="button"
      disabled={disabled}
    >
      Switch Direction
    </button>
  );
};
