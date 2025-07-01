import { InputField } from './InputField';
import styles from './AddLiquidity.module.scss';

interface DisabledAddLiquidityProps {
  tokenSymbol: string;
}

export const DisabledAddLiquidity = ({
  tokenSymbol,
}: DisabledAddLiquidityProps) => {
  return (
    <>
      <div className={styles.inputRow}>
        <InputField
          value={0}
          onChange={() => {}}
          placeholder="Enter ETH amount"
          disabled={true}
        />
        <InputField
          value={0}
          onChange={() => {}}
          placeholder={`Enter ${tokenSymbol} amount`}
          disabled={true}
        />
      </div>
      <button onClick={() => {}} disabled={true} className={styles.addButton}>
        Please connect wallet
      </button>
    </>
  );
};
