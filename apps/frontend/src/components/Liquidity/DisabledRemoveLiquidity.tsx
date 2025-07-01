import { InputWithOutput } from '../shared/InputWithOutput';
import styles from './RemoveLiquidity.module.scss';

export const DisabledRemoveLiquidity = () => {
  const generateExpectedOutput = () => `0.0000 SIMP + 0.0000 ETH`;

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
