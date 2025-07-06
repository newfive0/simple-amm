import { ethers } from 'ethers';
import styles from './InputWithOutput.module.scss';

interface InputWithOutputProps {
  amountWei: bigint;
  onChange: (amountWei: bigint) => void;
  placeholder: string;
  generateExpectedOutput: (value: string) => string;
  disabled?: boolean;
}

export const InputWithOutput = ({
  amountWei,
  onChange,
  placeholder,
  generateExpectedOutput,
  disabled = false,
}: InputWithOutputProps) => {
  const displayValue =
    amountWei === 0n ? '' : ethers.formatUnits(amountWei, 18);

  return (
    <div className={styles.inputRow}>
      <input
        type="number"
        step="0.01"
        value={displayValue}
        onChange={(e) => {
          if (disabled) return;
          const value = e.target.value;
          if (value === '') {
            onChange(0n);
            return;
          }
          try {
            const weiValue = ethers.parseUnits(value, 18);
            onChange(weiValue);
          } catch {
            // Invalid input, ignore
          }
        }}
        placeholder={placeholder}
        className={styles.inputLeft}
        disabled={disabled}
      />
      <div className={styles.expectedOutput}>
        {generateExpectedOutput(displayValue)}
      </div>
    </div>
  );
};
