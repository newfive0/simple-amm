import { SwitchDirectionButton } from './SwitchDirectionButton';
import { InputWithOutput } from '../shared/InputWithOutput';
import { createSwapOutputCalculator } from '../../utils/outputDisplayFormatters';
import styles from './Swap.module.scss';

interface DisabledSwapProps {
  poolEthReserve?: bigint;
  poolTokenReserve?: bigint;
}

export const DisabledSwap = ({
  poolEthReserve = 0n,
  poolTokenReserve = 0n,
}: DisabledSwapProps) => {
  return (
    <div className={styles.swap}>
      <div className={styles.header}>
        <h2 className={styles.title}>Swap</h2>
        <SwitchDirectionButton onClick={() => {}} disabled={true} />
      </div>
      <InputWithOutput
        key="eth-to-token"
        amountWei={0n}
        onChange={() => {}}
        placeholder="Amount of ETH to spend"
        generateExpectedOutput={createSwapOutputCalculator(
          poolEthReserve,
          poolTokenReserve,
          'ETH',
          'SIMP'
        )}
        disabled={true}
      />
      <button onClick={() => {}} disabled={true} className={styles.swapButton}>
        Please connect wallet
      </button>
    </div>
  );
};
