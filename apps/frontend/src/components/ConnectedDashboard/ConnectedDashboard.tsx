import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '../../contexts';
import { WalletInfo, Swap, Liquidity } from '../';
import { Token__factory, AMMPool__factory } from '@typechain-types';
import { config } from '../../config';
import {
  getPoolReserves,
  ensureTokenSymbolIsSIMP,
  getLiquidityBalances,
  PoolReserves,
  LiquidityBalances,
} from '../../utils/balances';

export const ConnectedDashboard = () => {
  return <DashboardContent />;
};

const DashboardContent = () => {
  const { account, signer, ethereumProvider } = useWallet();
  const [poolReserves, setPoolReserves] = useState<PoolReserves>({
    ethReserve: 0n,
    tokenReserve: 0n,
  });
  const [lpTokenBalances, setLpTokenBalances] = useState<LiquidityBalances>({
    userLPTokens: 0,
    totalLPTokens: 0,
    poolOwnershipPercentage: 0,
  });

  // Fetch all balances and token info
  const refreshAllBalances = useCallback(async () => {
    if (!signer || !ethereumProvider || !account) {
      setPoolReserves({ ethReserve: 0n, tokenReserve: 0n });
      setLpTokenBalances({
        userLPTokens: 0,
        totalLPTokens: 0,
        poolOwnershipPercentage: 0,
      });
      return;
    }

    try {
      const [poolReserves, lpTokenBal] = await Promise.all([
        getPoolReserves(signer),
        getLiquidityBalances(signer, account),
        ensureTokenSymbolIsSIMP(signer),
      ]);

      setPoolReserves(poolReserves);
      setLpTokenBalances(lpTokenBal);
    } catch (error) {
      console.error(
        `Failed to fetch balances: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }, [signer, ethereumProvider, account]);

  // Initial load
  useEffect(() => {
    refreshAllBalances();
  }, [refreshAllBalances]);

  const handleSwapComplete = async () => {
    await refreshAllBalances();
  };

  const handleLiquidityComplete = async () => {
    await refreshAllBalances();
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0',
      }}
    >
      <WalletInfo account={account} />

      <ContractsSection
        poolEthReserve={poolReserves.ethReserve}
        poolTokenReserve={poolReserves.tokenReserve}
        lpTokenBalances={lpTokenBalances}
        onSwapComplete={handleSwapComplete}
        onLiquidityComplete={handleLiquidityComplete}
      />
    </div>
  );
};

interface ContractsSectionProps {
  poolEthReserve: bigint;
  poolTokenReserve: bigint;
  lpTokenBalances: LiquidityBalances;
  onSwapComplete: () => Promise<void>;
  onLiquidityComplete: () => Promise<void>;
}

const ContractsSection = ({
  poolEthReserve,
  poolTokenReserve,
  lpTokenBalances,
  onSwapComplete,
  onLiquidityComplete,
}: ContractsSectionProps) => {
  const { signer } = useWallet();

  if (!signer) {
    return <div>Wallet not connected</div>;
  }

  const tokenContract = Token__factory.connect(
    config.contracts.tokenAddress,
    signer
  );
  const ammContract = AMMPool__factory.connect(
    config.contracts.ammPoolAddress,
    signer
  );
  return (
    <>
      <Swap
        ammContract={ammContract}
        tokenContract={tokenContract}
        poolEthReserve={poolEthReserve}
        poolTokenReserve={poolTokenReserve}
        onSwapComplete={onSwapComplete}
      />

      <Liquidity
        ammContract={ammContract}
        tokenContract={tokenContract}
        poolEthReserve={poolEthReserve}
        poolTokenReserve={poolTokenReserve}
        lpTokenBalances={lpTokenBalances}
        onLiquidityComplete={onLiquidityComplete}
      />
    </>
  );
};

export default ConnectedDashboard;
