import { InputWithOutput } from '../shared/InputWithOutput';
import styles from './RemoveLiquidity.module.scss';

interface DisabledRemoveLiquidityProps {
  tokenSymbol: string;
}

export const DisabledRemoveLiquidity = ({
  tokenSymbol,
}: DisabledRemoveLiquidityProps) => {
  const generateExpectedOutput = () => `0.0000 ${tokenSymbol} + 0.0000 ETH`;

  return (
    <>
      <InputWithOutput
        value=""
        onChange={() => {}}
        placeholder="LP Tokens to Remove"
        generateExpectedOutput={generateExpectedOutput}
        disabled={true}
      />
      <button
        onClick={() => {}}
        disabled={true}
        className={styles.removeButton}
      >
        Please connect wallet
      </button>
    </>
  );
};
