import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useErrorMessage } from '../../contexts/ErrorMessageContext';
import styles from './InputField.module.scss';

interface LiquidityInputProps {
  amountWei: bigint;
  onChange: (amountWei: bigint) => void;
  placeholder: string;
  disabled?: boolean;
}

export const LiquidityInput = ({
  amountWei,
  onChange,
  placeholder,
  disabled = false,
}: LiquidityInputProps) => {
  const { setErrorMessage } = useErrorMessage();
  const [displayValue, setDisplayValue] = useState('');

  // Update display value when amountWei changes externally (e.g., form reset)
  useEffect(() => {
    if (amountWei === 0n) {
      setDisplayValue('');
    } else {
      // Only update if the current display value would parse to a different amount
      try {
        const currentParsed =
          displayValue === '' ? 0n : ethers.parseUnits(displayValue, 18);
        if (currentParsed !== amountWei) {
          setDisplayValue(ethers.formatUnits(amountWei, 18));
        }
      } catch {
        // If current display value is invalid, update it
        setDisplayValue(ethers.formatUnits(amountWei, 18));
      }
    }
  }, [amountWei, displayValue]);

  return (
    <div className={styles.inputGroup}>
      <input
        type="number"
        step="0.01"
        value={displayValue}
        onChange={(e) => {
          if (disabled) return;
          const value = e.target.value;
          setDisplayValue(value);

          if (value === '') {
            onChange(0n);
            return;
          }
          try {
            const weiValue = ethers.parseUnits(value, 18);
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
