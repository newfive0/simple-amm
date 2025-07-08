import { useState, useEffect } from 'react';
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
    <div className={styles.inputRow}>
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
