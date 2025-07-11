import { SwitchDirectionButton } from './SwitchDirectionButton';
import { TokenAmountInputPair } from '../shared';
import styles from './Swap.module.scss';

export const DisabledSwap = () => {
  return (
    <div className={styles.swap}>
      <div className={styles.header}>
        <h2 className={styles.title}>Swap</h2>
        <SwitchDirectionButton onClick={() => {}} disabled={true} />
      </div>
      <TokenAmountInputPair
        ethAmount={0n}
        tokenAmount={0n}
        onEthAmountChange={() => {}}
        onTokenAmountChange={() => {}}
        ethPlaceholder="Sell ETH"
        tokenPlaceholder="Buy SIMP"
        disabled={true}
      />
      <button onClick={() => {}} disabled={true} className={styles.swapButton}>
        Please connect wallet
      </button>
    </div>
  );
};
