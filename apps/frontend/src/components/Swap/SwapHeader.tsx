import { SwitchDirectionButton } from './SwitchDirectionButton';
import styles from './Swap.module.scss';

interface SwapHeaderProps {
  swapDirection: 'eth-to-token' | 'token-to-eth';
  onDirectionChange: (direction: 'eth-to-token' | 'token-to-eth') => void;
}

export const SwapHeader = ({
  swapDirection,
  onDirectionChange,
}: SwapHeaderProps) => {
  const handleSwitchDirection = () => {
    const newDirection =
      swapDirection === 'eth-to-token' ? 'token-to-eth' : 'eth-to-token';
    onDirectionChange(newDirection);
  };

  return (
    <div className={styles.header}>
      <h2 className={styles.title}>Swap</h2>
      <SwitchDirectionButton onClick={handleSwitchDirection} />
    </div>
  );
};
