import { TokenAmountInput } from './TokenAmountInput';
import styles from './TokenAmountInputPair.module.scss';

interface TokenAmountInputPairProps {
  ethAmount: bigint;
  tokenAmount: bigint;
  onEthAmountChange: (amount: bigint) => void;
  onTokenAmountChange: (amount: bigint) => void;
  ethPlaceholder?: string;
  tokenPlaceholder?: string;
  disabled?: boolean;
  reversed?: boolean;
}

export const TokenAmountInputPair = ({
  ethAmount,
  tokenAmount,
  onEthAmountChange,
  onTokenAmountChange,
  ethPlaceholder = 'Enter ETH amount',
  tokenPlaceholder = 'Enter SIMP amount',
  disabled = false,
  reversed = false,
}: TokenAmountInputPairProps) => {
  const ethInput = (
    <TokenAmountInput
      amountWei={ethAmount}
      onChange={onEthAmountChange}
      placeholder={ethPlaceholder}
      disabled={disabled}
    />
  );

  const tokenInput = (
    <TokenAmountInput
      amountWei={tokenAmount}
      onChange={onTokenAmountChange}
      placeholder={tokenPlaceholder}
      disabled={disabled}
    />
  );

  return (
    <div className={styles.inputRow}>
      {reversed ? tokenInput : ethInput}
      {reversed ? ethInput : tokenInput}
    </div>
  );
};
