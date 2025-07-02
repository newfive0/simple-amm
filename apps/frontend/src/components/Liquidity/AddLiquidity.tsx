import { useState } from 'react';
import { ethers } from 'ethers';
import { Token, AMMPool } from '@typechain-types';
import { LiquidityInput } from './LiquidityInput';
import { useErrorMessage } from '../../contexts/ErrorMessageContext';
import {
  getFriendlyMessage,
  ERROR_OPERATIONS,
} from '../../utils/errorMessages';
import styles from './AddLiquidity.module.scss';

interface AddLiquidityProps {
  ammContract: AMMPool;
  tokenContract: Token;
  poolEthReserve: number;
  poolTokenReserve: number;
  onLiquidityComplete: () => void;
}

export const AddLiquidity = ({
  ammContract,
  tokenContract,
  poolEthReserve,
  poolTokenReserve,
  onLiquidityComplete,
}: AddLiquidityProps) => {
  const [liquidityEthAmount, setLiquidityEthAmount] = useState<number>(0);
  const [liquidityTokenAmount, setLiquidityTokenAmount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const { setErrorMessage } = useErrorMessage();

  const calculateCorrespondingAmount = (
    amount: number,
    isEthInput: boolean
  ): number => {
    if (!amount || amount === 0) {
      return 0;
    }

    const poolEthFloat = poolEthReserve;
    const poolTokenFloat = poolTokenReserve;

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

    const poolEthFloat = poolEthReserve;
    const poolTokenFloat = poolTokenReserve;
    const poolHasLiquidity = poolEthFloat > 0 && poolTokenFloat > 0;

    // If pool has liquidity, always update the other field (including clearing it)
    if (poolHasLiquidity) {
      setLiquidityTokenAmount(correspondingTokenAmount);
    }
  };

  const handleTokenAmountChange = (value: number) => {
    setLiquidityTokenAmount(value);
    const correspondingEthAmount = calculateCorrespondingAmount(value, false);

    const poolEthFloat = poolEthReserve;
    const poolTokenFloat = poolTokenReserve;
    const poolHasLiquidity = poolEthFloat > 0 && poolTokenFloat > 0;

    // If pool has liquidity, always update the other field (including clearing it)
    if (poolHasLiquidity) {
      setLiquidityEthAmount(correspondingEthAmount);
    }
  };

  const resetForm = () => {
    setLiquidityEthAmount(0);
    setLiquidityTokenAmount(0);
  };

  const approveTokenSpending = async (amount: number) => {
    const ammPoolAddress = await ammContract.getAddress();
    const approveTx = await tokenContract.approve(
      ammPoolAddress,
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
      setErrorMessage(''); // Clear any previous errors on success
    } catch (error) {
      setErrorMessage(
        getFriendlyMessage(ERROR_OPERATIONS.ADD_LIQUIDITY, error)
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className={styles.inputRow}>
        <LiquidityInput
          value={liquidityEthAmount}
          onChange={handleEthAmountChange}
          placeholder="Enter ETH amount"
        />
        <LiquidityInput
          value={liquidityTokenAmount}
          onChange={handleTokenAmountChange}
          placeholder="Enter SIMP amount"
        />
      </div>
      <button
        onClick={addLiquidity}
        disabled={isLoading || !liquidityEthAmount || !liquidityTokenAmount}
        className={styles.addButton}
      >
        {isLoading ? 'Waiting...' : 'Add Liquidity'}
      </button>
    </>
  );
};
