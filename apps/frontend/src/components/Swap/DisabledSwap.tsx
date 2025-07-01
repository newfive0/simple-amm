import { InputWithOutput } from '../shared/InputWithOutput';
import { TabGroup } from '../shared/TabGroup';
import { createSwapOutputCalculator } from '../../utils/expectedOutputCalculators';
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

const SwapInput = ({
  value,
  onChange,
  placeholder,
  onClick,
  buttonText,
  isLoading,
  generateExpectedOutput,
  disabled = false,
}: SwapInputProps) => (
  <div className={styles.swapInput}>
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
  </div>
);

interface DisabledSwapProps {
  poolEthReserve?: number;
  poolTokenReserve?: number;
  tokenSymbol?: string;
}

export const DisabledSwap = ({
  poolEthReserve = 0,
  poolTokenReserve = 0,
  tokenSymbol = 'SIMP',
}: DisabledSwapProps) => {
  return (
    <div className={styles.swap}>
      <div className={styles.header}>
        <h2 className={styles.title}>Swap</h2>
        <TabGroup
          options={[
            { id: 'token-to-eth', label: 'ETH' },
            { id: 'eth-to-token', label: tokenSymbol },
          ]}
          activeTab="token-to-eth"
          onTabChange={() => {}}
          disabled={true}
          tabLabel="Receive"
        />
      </div>
      <SwapInput
        key="token-to-eth"
        value=""
        onChange={() => {}}
        placeholder={`${tokenSymbol} → ETH`}
        onClick={() => {}}
        buttonText="Please connect wallet"
        isLoading={false}
        generateExpectedOutput={createSwapOutputCalculator(
          poolEthReserve,
          poolTokenReserve,
          tokenSymbol,
          'ETH'
        )}
        disabled={true}
      />
    </div>
  );
};
