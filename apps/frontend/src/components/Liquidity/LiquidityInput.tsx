import { useErrorMessage } from '../../contexts/ErrorMessageContext';
import styles from './InputField.module.scss';

interface LiquidityInputProps {
  value: number;
  onChange: (value: number) => void;
  placeholder: string;
  disabled?: boolean;
}

export const LiquidityInput = ({
  value,
  onChange,
  placeholder,
  disabled = false,
}: LiquidityInputProps) => {
  const { setErrorMessage } = useErrorMessage();

  return (
    <div className={styles.inputGroup}>
      <input
        type="number"
        step="0.01"
        value={value === 0 ? '' : value.toString()}
        onChange={(e) => {
          if (disabled) return;
          const value = e.target.value;
          if (value === '') {
            onChange(0);
            return;
          }
          const numValue = Number(value);
          if (isNaN(numValue)) {
            setErrorMessage('Please enter a valid number');
            return;
          }
          onChange(numValue);
        }}
        placeholder={placeholder}
        className={styles.input}
        autoFocus={false}
        disabled={disabled}
      />
    </div>
  );
};
