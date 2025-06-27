import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '../../contexts';
import { WalletInfo, Swap, Liquidity } from '../';
import { Token__factory, AMMPool__factory } from '@typechain-types';
import { config } from '../../config';
import { getWalletBalances, getPoolBalances, getTokenSymbol, WalletBalances, PoolBalances } from '../../utils/balances';

export const ConnectedDashboard = () => {
  return <DashboardContent />;
};

const DashboardContent = () => {
  const { account, isCheckingConnection, signer, ethereumProvider } = useWallet();
  const [walletBalances, setWalletBalances] = useState<WalletBalances>({ ethBalance: 0, tokenBalance: 0 });
  const [poolBalances, setPoolBalances] = useState<PoolBalances>({ ethReserve: 0, tokenReserve: 0 });
  const [tokenSymbol, setTokenSymbol] = useState<string>('');

  // Fetch all balances and token info
  const refreshAllBalances = useCallback(async () => {
    if (!signer || !ethereumProvider || !account) {
      setWalletBalances({ ethBalance: 0, tokenBalance: 0 });
      setPoolBalances({ ethReserve: 0, tokenReserve: 0 });
      setTokenSymbol('');
      return;
    }

    try {
      const [walletBal, poolBal, symbol] = await Promise.all([
        getWalletBalances(ethereumProvider, account, signer),
        getPoolBalances(signer),
        getTokenSymbol(signer),
      ]);

      setWalletBalances(walletBal);
      setPoolBalances(poolBal);
      setTokenSymbol(symbol);
    } catch (error) {
      console.error(`Failed to fetch balances: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      gap: '0' 
    }}>
      <WalletInfo
        account={account}
        ethBalance={walletBalances.ethBalance}
        tokenBalance={walletBalances.tokenBalance}
        tokenSymbol={tokenSymbol}
        isCheckingConnection={isCheckingConnection}
      />

      <ContractsSection 
        poolEthBalance={poolBalances.ethReserve}
        poolTokenBalance={poolBalances.tokenReserve}
        tokenSymbol={tokenSymbol}
        onSwapComplete={handleSwapComplete}
        onLiquidityComplete={handleLiquidityComplete}
      />
    </div>
  );
};

interface ContractsSectionProps {
  poolEthBalance: number;
  poolTokenBalance: number;
  tokenSymbol: string;
  onSwapComplete: () => Promise<void>;
  onLiquidityComplete: () => Promise<void>;
}

const ContractsSection = ({
  poolEthBalance,
  poolTokenBalance,
  tokenSymbol,
  onSwapComplete,
  onLiquidityComplete,
}: ContractsSectionProps) => {
  const { signer } = useWallet();

  if (!signer) {
    return <div>Wallet not connected</div>;
  }

  const tokenContract = Token__factory.connect(config.contracts.tokenAddress, signer);
  const ammContract = AMMPool__factory.connect(config.contracts.ammPoolAddress, signer);
  const contractAddresses = config.contracts;

  return (
    <>
      <Swap
        ammContract={ammContract}
        tokenContract={tokenContract}
        contractAddresses={contractAddresses}
        poolEthBalance={poolEthBalance}
        poolTokenBalance={poolTokenBalance}
        tokenSymbol={tokenSymbol}
        onSwapComplete={onSwapComplete}
      />

      <Liquidity
        ammContract={ammContract}
        tokenContract={tokenContract}
        contractAddresses={contractAddresses}
        poolEthBalance={poolEthBalance}
        poolTokenBalance={poolTokenBalance}
        tokenSymbol={tokenSymbol}
        onLiquidityComplete={onLiquidityComplete}
      />
    </>
  );
};

export default ConnectedDashboard;