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
}

export const TokenAmountInputPair = ({
  ethAmount,
  tokenAmount,
  onEthAmountChange,
  onTokenAmountChange,
  ethPlaceholder = 'Enter ETH amount',
  tokenPlaceholder = 'Enter SIMP amount',
  disabled = false,
}: TokenAmountInputPairProps) => {
  return (
    <div className={styles.inputRow}>
      <TokenAmountInput
        amountWei={ethAmount}
        onChange={onEthAmountChange}
        placeholder={ethPlaceholder}
        disabled={disabled}
      />
      <TokenAmountInput
        amountWei={tokenAmount}
        onChange={onTokenAmountChange}
        placeholder={tokenPlaceholder}
        disabled={disabled}
      />
    </div>
  );
};
