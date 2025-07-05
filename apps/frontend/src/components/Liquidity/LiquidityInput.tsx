import { ethers } from 'ethers';
import { useErrorMessage } from '../../contexts/ErrorMessageContext';
import styles from './InputField.module.scss';

// Helper function to format BigInt amounts for input display (removes trailing zeros)
const formatAmountForInput = (amount: bigint): string => {
  if (amount === 0n) return '';
  const formatted = ethers.formatUnits(amount, 18);
  // Remove trailing zeros and unnecessary decimal point
  return formatted.replace(/\.?0+$/, '');
};

interface LiquidityInputProps {
  valueWei: bigint;
  onChange: (valueWei: bigint) => void;
  placeholder: string;
  disabled?: boolean;
}

export const LiquidityInput = ({
  valueWei,
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
        value={formatAmountForInput(valueWei)}
        onChange={(e) => {
          if (disabled) return;
          const value = e.target.value;
          if (value === '') {
            onChange(0n);
            return;
          }
          const numValue = parseFloat(value);
          if (isNaN(numValue)) {
            setErrorMessage('Please enter a valid number');
            return;
          }
          try {
            const weiValue = ethers.parseUnits(numValue.toString(), 18);
            onChange(weiValue);
          } catch {
            setErrorMessage('Please enter a valid number');
          }
        }}
        placeholder={placeholder}
        className={styles.input}
        autoFocus={false}
        disabled={disabled}
      />
    </div>
  );
};
