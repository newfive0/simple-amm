import React, { useState } from 'react';
import { ethers } from 'ethers';
import styles from './Liquidity.module.scss';

interface LiquidityProps {
  ammContract: ethers.Contract;
  tokenContract: ethers.Contract;
  contractAddresses: {
    tokenAddress: string;
    ammPoolAddress: string;
  };
  poolEthBalance: string;
  poolTokenBalance: string;
  tokenSymbol: string;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  onLiquidityComplete: () => void;
}

export const Liquidity: React.FC<LiquidityProps> = ({
  ammContract,
  tokenContract,
  contractAddresses,
  poolEthBalance,
  poolTokenBalance,
  tokenSymbol,
  isLoading,
  setIsLoading,
  onLiquidityComplete,
}) => {
  const [liquidityEthAmount, setLiquidityEthAmount] = useState<string>('');
  const [liquidityTokenAmount, setLiquidityTokenAmount] = useState<string>('');

  const handleError = (error: unknown) => {
    console.error('Add liquidity failed:', error);
    alert('Failed to add liquidity. Check console for details.');
  };

  const resetForm = () => {
    setLiquidityEthAmount('');
    setLiquidityTokenAmount('');
  };

  const approveTokenSpending = async (amount: string) => {
    const approveTx = await tokenContract.approve(
      contractAddresses.ammPoolAddress,
      ethers.parseEther(amount),
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
        ethers.parseEther(liquidityTokenAmount),
        { value: ethers.parseEther(liquidityEthAmount) },
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
      <h3>Pool Balances</h3>
      <p>
        <strong>ETH</strong> {parseFloat(poolEthBalance).toFixed(4)} ETH
      </p>
      <p>
        <strong>Tokens</strong> {parseFloat(poolTokenBalance).toFixed(4)} {tokenSymbol}
      </p>
    </div>
  );

  const InputField = ({ 
    label, 
    value, 
    onChange, 
    placeholder 
  }: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
  }) => (
    <div className={styles.inputGroup}>
      <label className={styles.label}>{label}</label>
      <input
        type="number"
        step="0.01"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={styles.input}
      />
    </div>
  );

  return (
    <div className={styles.liquidity}>
      <h2 className={styles.title}>Add Liquidity</h2>
      <PoolBalances />
      <InputField
        label="ETH Amount"
        value={liquidityEthAmount}
        onChange={setLiquidityEthAmount}
        placeholder="Enter ETH amount"
      />
      <InputField
        label="Token Amount"
        value={liquidityTokenAmount}
        onChange={setLiquidityTokenAmount}
        placeholder="Enter token amount"
      />
      <button
        onClick={addLiquidity}
        disabled={isLoading || !liquidityEthAmount || !liquidityTokenAmount}
        className={styles.addButton}
      >
        {isLoading ? 'Adding Liquidity...' : 'Add Liquidity'}
      </button>
    </div>
  );
};

export default Liquidity;