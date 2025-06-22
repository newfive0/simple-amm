import { useState } from 'react';
import { ethers } from 'ethers';
import { Token, AMMPool } from '../../typechain-types';
import styles from './Liquidity.module.scss';

interface InputFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}

const InputField = ({ 
  label, 
  value, 
  onChange, 
  placeholder 
}: InputFieldProps) => (
  <div className={styles.inputGroup}>
    <label className={styles.label}>{label}</label>
    <input
      type="number"
      step="0.01"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={styles.input}
      autoFocus={false}
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
  poolEthBalance: string;
  poolTokenBalance: string;
  tokenSymbol: string;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  onLiquidityComplete: () => void;
}

export const Liquidity = ({
  ammContract,
  tokenContract,
  contractAddresses,
  poolEthBalance,
  poolTokenBalance,
  tokenSymbol,
  isLoading,
  setIsLoading,
  onLiquidityComplete,
}: LiquidityProps) => {
  const [liquidityEthAmount, setLiquidityEthAmount] = useState<string>('');
  const [liquidityTokenAmount, setLiquidityTokenAmount] = useState<string>('');

  const calculateCorrespondingAmount = (amount: string, isEthInput: boolean): string => {
    if (!amount || amount === '0') {
      return '';
    }
    
    const poolEthFloat = parseFloat(poolEthBalance);
    const poolTokenFloat = parseFloat(poolTokenBalance);
    
    // If pool is empty, don't auto-calculate - let user set initial ratio
    if (poolEthFloat === 0 || poolTokenFloat === 0) {
      return '';
    }
    
    const inputAmount = parseFloat(amount);
    if (isNaN(inputAmount)) return '';
    
    if (isEthInput) {
      // Calculate required token amount based on ETH input
      const requiredTokens = (inputAmount * poolTokenFloat) / poolEthFloat;
      return requiredTokens.toFixed(6);
    } else {
      // Calculate required ETH amount based on token input
      const requiredEth = (inputAmount * poolEthFloat) / poolTokenFloat;
      return requiredEth.toFixed(6);
    }
  };

  const handleEthAmountChange = (value: string) => {
    setLiquidityEthAmount(value);
    const correspondingTokenAmount = calculateCorrespondingAmount(value, true);
    
    const poolEthFloat = parseFloat(poolEthBalance);
    const poolTokenFloat = parseFloat(poolTokenBalance);
    const poolHasLiquidity = poolEthFloat > 0 && poolTokenFloat > 0;
    
    // If pool has liquidity, always update the other field (including clearing it)
    if (poolHasLiquidity) {
      setLiquidityTokenAmount(correspondingTokenAmount);
    }
  };

  const handleTokenAmountChange = (value: string) => {
    setLiquidityTokenAmount(value);
    const correspondingEthAmount = calculateCorrespondingAmount(value, false);
    
    const poolEthFloat = parseFloat(poolEthBalance);
    const poolTokenFloat = parseFloat(poolTokenBalance);
    const poolHasLiquidity = poolEthFloat > 0 && poolTokenFloat > 0;
    
    // If pool has liquidity, always update the other field (including clearing it)
    if (poolHasLiquidity) {
      setLiquidityEthAmount(correspondingEthAmount);
    }
  };

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
      <p>
        <strong>Pool Balance:</strong> {parseFloat(poolTokenBalance).toFixed(4)} {tokenSymbol} / {parseFloat(poolEthBalance).toFixed(4)} ETH
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

export default Liquidity;