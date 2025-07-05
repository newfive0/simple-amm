import { ethers } from 'ethers';
import { InputWithOutput } from '../shared/InputWithOutput';
import styles from './Swap.module.scss';

interface SwapInputProps {
  amountWei: bigint;
  onChange: (amountWei: bigint) => void;
  placeholder: string;
  onClick: () => void;
  buttonText: string;
  isLoading: boolean;
  generateExpectedOutput: (value: string) => string;
  disabled?: boolean;
}

export const SwapInput = ({
  amountWei,
  onChange,
  placeholder,
  onClick,
  buttonText,
  isLoading,
  generateExpectedOutput,
  disabled = false,
}: SwapInputProps) => (
  <>
    <InputWithOutput
      value={amountWei === 0n ? '' : ethers.formatUnits(amountWei, 18)}
      onChange={(value) => {
        const numValue = parseFloat(value || '0');
        onChange(
          isNaN(numValue) ? 0n : ethers.parseUnits(numValue.toString(), 18)
        );
      }}
      placeholder={placeholder}
      generateExpectedOutput={generateExpectedOutput}
      disabled={disabled}
    />
    <button
      onClick={onClick}
      disabled={disabled || isLoading || amountWei === 0n}
      className={styles.swapButton}
    >
      {isLoading ? 'Waiting...' : buttonText}
    </button>
  </>
);
