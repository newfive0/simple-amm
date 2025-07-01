import styles from './InputWithOutput.module.scss';

interface InputWithOutputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  generateExpectedOutput: (value: string) => string;
  disabled?: boolean;
}

export const InputWithOutput = ({
  value,
  onChange,
  placeholder,
  generateExpectedOutput,
  disabled = false,
}: InputWithOutputProps) => (
  <div className={styles.inputRow}>
    <input
      type="number"
      step="0.01"
      value={value}
      onChange={(e) => !disabled && onChange(e.target.value)}
      placeholder={placeholder}
      className={styles.inputLeft}
      disabled={disabled}
    />
    <div className={styles.expectedOutput}>{generateExpectedOutput(value)}</div>
  </div>
);
