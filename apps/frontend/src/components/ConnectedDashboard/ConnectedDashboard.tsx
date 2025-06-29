import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '../../contexts';
import { WalletInfo, Swap, Liquidity } from '../';
import { Token__factory, AMMPool__factory } from '@typechain-types';
import { config } from '../../config';
import {
  getWalletBalances,
  getPoolReserves,
  getTokenSymbol,
  getLiquidityBalances,
  WalletBalances,
  PoolReserves,
  LiquidityBalances,
} from '../../utils/balances';

export const ConnectedDashboard = () => {
  return <DashboardContent />;
};

const DashboardContent = () => {
  const { account, signer, ethereumProvider } = useWallet();
  const [walletBalances, setWalletBalances] = useState<WalletBalances>({
    ethBalance: 0,
    tokenBalance: 0,
  });
  const [poolReserves, setPoolReserves] = useState<PoolReserves>({
    ethReserve: 0,
    tokenReserve: 0,
  });
  const [lpTokenBalances, setLpTokenBalances] = useState<LiquidityBalances>({
    userLPTokens: 0,
    totalLPTokens: 0,
    poolOwnershipPercentage: 0,
  });
  const [tokenSymbol, setTokenSymbol] = useState<string>('');

  // Fetch all balances and token info
  const refreshAllBalances = useCallback(async () => {
    if (!signer || !ethereumProvider || !account) {
      setWalletBalances({ ethBalance: 0, tokenBalance: 0 });
      setPoolReserves({ ethReserve: 0, tokenReserve: 0 });
      setLpTokenBalances({
        userLPTokens: 0,
        totalLPTokens: 0,
        poolOwnershipPercentage: 0,
      });
      setTokenSymbol('');
      return;
    }

    try {
      const [walletBal, poolReserves, lpTokenBal, symbol] = await Promise.all([
        getWalletBalances(ethereumProvider, account, signer),
        getPoolReserves(signer),
        getLiquidityBalances(signer, account),
        getTokenSymbol(signer),
      ]);

      setWalletBalances(walletBal);
      setPoolReserves(poolReserves);
      setLpTokenBalances(lpTokenBal);
      setTokenSymbol(symbol);
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
      <WalletInfo
        account={account}
        ethBalance={walletBalances.ethBalance}
        tokenBalance={walletBalances.tokenBalance}
        tokenSymbol={tokenSymbol}
      />

      <ContractsSection
        poolEthReserve={poolReserves.ethReserve}
        poolTokenReserve={poolReserves.tokenReserve}
        lpTokenBalances={lpTokenBalances}
        tokenSymbol={tokenSymbol}
        onSwapComplete={handleSwapComplete}
        onLiquidityComplete={handleLiquidityComplete}
      />
    </div>
  );
};

interface ContractsSectionProps {
  poolEthReserve: number;
  poolTokenReserve: number;
  lpTokenBalances: LiquidityBalances;
  tokenSymbol: string;
  onSwapComplete: () => Promise<void>;
  onLiquidityComplete: () => Promise<void>;
}

const ContractsSection = ({
  poolEthReserve,
  poolTokenReserve,
  lpTokenBalances,
  tokenSymbol,
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
  const contractAddresses = config.contracts;

  return (
    <>
      <Swap
        ammContract={ammContract}
        tokenContract={tokenContract}
        contractAddresses={contractAddresses}
        poolEthReserve={poolEthReserve}
        poolTokenReserve={poolTokenReserve}
        tokenSymbol={tokenSymbol}
        onSwapComplete={onSwapComplete}
      />

      <Liquidity
        ammContract={ammContract}
        tokenContract={tokenContract}
        contractAddresses={contractAddresses}
        poolEthReserve={poolEthReserve}
        poolTokenReserve={poolTokenReserve}
        lpTokenBalances={lpTokenBalances}
        tokenSymbol={tokenSymbol}
        onLiquidityComplete={onLiquidityComplete}
      />
    </>
  );
};

export default ConnectedDashboard;
