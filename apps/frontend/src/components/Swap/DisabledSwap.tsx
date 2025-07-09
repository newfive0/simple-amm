import { SwitchDirectionButton } from './SwitchDirectionButton';
import { SwapInput } from './SwapInput';
import { createReverseSwapCalculator } from '../../utils/outputDisplayFormatters';
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
      <SwapInput
        key="eth-to-token"
        amountWei={0n}
        onChange={() => {}}
        placeholder="Get SIMP"
        onClick={() => {}}
        buttonText="Please connect wallet"
        isLoading={false}
        generateExpectedOutput={createReverseSwapCalculator(
          poolEthReserve,
          poolTokenReserve,
          'ETH',
          'SIMP'
        )}
        disabled={true}
      />
    </div>
  );
};
