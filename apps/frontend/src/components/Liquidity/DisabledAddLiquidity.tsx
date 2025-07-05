import { LiquidityInput } from './LiquidityInput';
import styles from './AddLiquidity.module.scss';

export const DisabledAddLiquidity = () => {
  return (
    <>
      <div className={styles.inputRow}>
        <LiquidityInput
          valueWei={0n}
          onChange={() => {}}
          placeholder="Enter ETH amount"
          disabled={true}
        />
        <LiquidityInput
          valueWei={0n}
          onChange={() => {}}
          placeholder="Enter SIMP amount"
          disabled={true}
        />
      </div>
      <button onClick={() => {}} disabled={true} className={styles.addButton}>
        Please connect wallet
      </button>
    </>
  );
};
