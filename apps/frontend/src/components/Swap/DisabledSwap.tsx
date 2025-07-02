import { TabGroup } from '../shared/TabGroup';
import { SwapInput } from './SwapInput';
import { createSwapOutputCalculator } from '../../utils/expectedOutputCalculators';
import styles from './Swap.module.scss';

interface DisabledSwapProps {
  poolEthReserve?: number;
  poolTokenReserve?: number;
}

export const DisabledSwap = ({
  poolEthReserve = 0,
  poolTokenReserve = 0,
}: DisabledSwapProps) => {
  return (
    <div className={styles.swap}>
      <div className={styles.header}>
        <h2 className={styles.title}>Swap</h2>
        <TabGroup
          options={[
            { id: 'token-to-eth', label: 'ETH' },
            { id: 'eth-to-token', label: 'SIMP' },
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
        placeholder="SIMP → ETH"
        onClick={() => {}}
        buttonText="Please connect wallet"
        isLoading={false}
        generateExpectedOutput={createSwapOutputCalculator(
          poolEthReserve,
          poolTokenReserve,
          'SIMP',
          'ETH'
        )}
        disabled={true}
      />
    </div>
  );
};
