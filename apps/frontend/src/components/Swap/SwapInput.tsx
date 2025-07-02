import { InputWithOutput } from '../shared/InputWithOutput';
import styles from './Swap.module.scss';

interface SwapInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  onClick: () => void;
  buttonText: string;
  isLoading: boolean;
  generateExpectedOutput: (value: string) => string;
  disabled?: boolean;
}

export const SwapInput = ({
  value,
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
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      generateExpectedOutput={generateExpectedOutput}
      disabled={disabled}
    />
    <button
      onClick={onClick}
      disabled={disabled || isLoading || !value}
      className={styles.swapButton}
    >
      {isLoading ? 'Waiting...' : buttonText}
    </button>
  </>
);
