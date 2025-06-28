import { useState } from 'react';
import { ethers } from 'ethers';
import { Token, AMMPool } from '@typechain-types';
import styles from './Liquidity.module.scss';

interface InputFieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  placeholder: string;
  disabled?: boolean;
}

const InputField = ({
  label,
  value,
  onChange,
  placeholder,
  disabled = false,
}: InputFieldProps) => (
  <div className={styles.inputGroup}>
    <label className={styles.label}>{label}</label>
    <input
      type="number"
      step="0.01"
      value={value === 0 ? '' : value.toString()}
      onChange={(e) => {
        if (disabled) return;
        const value = e.target.value;
        const numValue = Number(value);
        if (value && isNaN(numValue)) {
          alert('Please enter a valid number');
          return;
        }
        onChange(numValue || 0);
      }}
      placeholder={placeholder}
      className={styles.input}
      autoFocus={false}
      disabled={disabled}
    />
  </div>
);

interface LiquidityProps {
  ammContract: AMMPool;
  tokenContract: Token;
  contractAddresses: {
    tokenAddress: string;
    ammPoolAddress: string;
  };
  poolEthBalance: number;
  poolTokenBalance: number;
  tokenSymbol: string;
  onLiquidityComplete: () => void;
}

export const Liquidity = ({
  ammContract,
  tokenContract,
  contractAddresses,
  poolEthBalance,
  poolTokenBalance,
  tokenSymbol,
  onLiquidityComplete,
}: LiquidityProps) => {
  const [liquidityEthAmount, setLiquidityEthAmount] = useState<number>(0);
  const [liquidityTokenAmount, setLiquidityTokenAmount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);

  const calculateCorrespondingAmount = (
    amount: number,
    isEthInput: boolean
  ): number => {
    if (!amount || amount === 0) {
      return 0;
    }

    const poolEthFloat = poolEthBalance;
    const poolTokenFloat = poolTokenBalance;

    // If pool is empty, don't auto-calculate - let user set initial ratio
    if (poolEthFloat === 0 || poolTokenFloat === 0) {
      return 0;
    }

    if (isEthInput) {
      // Calculate required token amount based on ETH input
      return (amount * poolTokenFloat) / poolEthFloat;
    } else {
      // Calculate required ETH amount based on token input
      return (amount * poolEthFloat) / poolTokenFloat;
    }
  };

  const handleEthAmountChange = (value: number) => {
    setLiquidityEthAmount(value);
    const correspondingTokenAmount = calculateCorrespondingAmount(value, true);

    const poolEthFloat = poolEthBalance;
    const poolTokenFloat = poolTokenBalance;
    const poolHasLiquidity = poolEthFloat > 0 && poolTokenFloat > 0;

    // If pool has liquidity, always update the other field (including clearing it)
    if (poolHasLiquidity) {
      setLiquidityTokenAmount(correspondingTokenAmount);
    }
  };

  const handleTokenAmountChange = (value: number) => {
    setLiquidityTokenAmount(value);
    const correspondingEthAmount = calculateCorrespondingAmount(value, false);

    const poolEthFloat = poolEthBalance;
    const poolTokenFloat = poolTokenBalance;
    const poolHasLiquidity = poolEthFloat > 0 && poolTokenFloat > 0;

    // If pool has liquidity, always update the other field (including clearing it)
    if (poolHasLiquidity) {
      setLiquidityEthAmount(correspondingEthAmount);
    }
  };

  const handleError = (error: unknown) => {
    const message =
      error instanceof Error ? error.message : 'Unknown error occurred';
    alert(`Failed to add liquidity: ${message}`);
  };

  const resetForm = () => {
    setLiquidityEthAmount(0);
    setLiquidityTokenAmount(0);
  };

  const approveTokenSpending = async (amount: number) => {
    const approveTx = await tokenContract.approve(
      contractAddresses.ammPoolAddress,
      ethers.parseEther(amount.toString())
    );
    await approveTx.wait();
  };

  const addLiquidity = async () => {
    if (!liquidityEthAmount || !liquidityTokenAmount) {
      return;
    }

    setIsLoading(true);
    try {
      await approveTokenSpending(liquidityTokenAmount);

      const addLiquidityTx = await ammContract.addLiquidity(
        ethers.parseEther(liquidityTokenAmount.toString()),
        { value: ethers.parseEther(liquidityEthAmount.toString()) }
      );
      await addLiquidityTx.wait();

      onLiquidityComplete();
      resetForm();
    } catch (error) {
      handleError(error);
    } finally {
      setIsLoading(false);
    }
  };

  const PoolBalances = () => (
    <div className={styles.poolBalances}>
      <p>
        <strong>Pool Balance:</strong> {poolTokenBalance.toFixed(4)}{' '}
        {tokenSymbol} / {poolEthBalance.toFixed(4)} ETH
      </p>
    </div>
  );

  return (
    <div className={styles.liquidity}>
      <h2 className={styles.title}>Add Liquidity</h2>
      <PoolBalances />
      <InputField
        label="ETH Amount"
        value={liquidityEthAmount}
        onChange={handleEthAmountChange}
        placeholder="Enter ETH amount"
      />
      <InputField
        label="SIMP Amount"
        value={liquidityTokenAmount}
        onChange={handleTokenAmountChange}
        placeholder="Enter SIMP amount"
      />
      <button
        onClick={addLiquidity}
        disabled={isLoading || !liquidityEthAmount || !liquidityTokenAmount}
        className={styles.addButton}
      >
        {isLoading ? 'Waiting...' : 'Add Liquidity'}
      </button>
    </div>
  );
};

// DisabledLiquidity component for when wallet is not connected
export const DisabledLiquidity = () => {
  return (
    <div className={styles.liquidity}>
      <h2 className={styles.title}>Add Liquidity</h2>
      <div className={styles.poolBalances}>
        <p>
          <strong>Pool Balance:</strong> 0.0000 SIMP / 0.0000 ETH
        </p>
      </div>
      <InputField
        label="ETH Amount"
        value={0}
        onChange={() => {}}
        placeholder="Enter ETH amount"
        disabled={true}
      />
      <InputField
        label="SIMP Amount"
        value={0}
        onChange={() => {}}
        placeholder="Enter SIMP amount"
        disabled={true}
      />
      <button onClick={() => {}} disabled={true} className={styles.addButton}>
        Please connect wallet
      </button>
    </div>
  );
};
