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
      amountWei={amountWei}
      onChange={onChange}
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
