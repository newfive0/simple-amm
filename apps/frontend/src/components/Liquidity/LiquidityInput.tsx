import { useEffect, useRef, useState } from 'react';
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
  const inputRef = useRef<HTMLInputElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  // Update input value when amountWei changes externally, but not when focused
  useEffect(() => {
    if (inputRef.current && !isFocused) {
      const newValue =
        amountWei === 0n
          ? ''
          : parseFloat(ethers.formatUnits(amountWei, 18)).toFixed(4);
      inputRef.current.value = newValue;
    }
  }, [amountWei, isFocused]);

  return (
    <div className={styles.inputGroup}>
      <input
        ref={inputRef}
        type="number"
        step="0.01"
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
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
