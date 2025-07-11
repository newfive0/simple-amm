import { TokenAmountInputPair } from '../shared';
import styles from './AddLiquidity.module.scss';

export const DisabledAddLiquidity = () => {
  return (
    <>
      <TokenAmountInputPair
        ethAmount={0n}
        tokenAmount={0n}
        onEthAmountChange={() => {}}
        onTokenAmountChange={() => {}}
        disabled={true}
      />
      <button onClick={() => {}} disabled={true} className={styles.addButton}>
        Please connect wallet
      </button>
    </>
  );
};
