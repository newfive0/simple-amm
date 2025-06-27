import { useState, useEffect } from 'react';
import { useWallet, useBalances, BalanceProvider } from '../../contexts';
import { WalletInfo, Swap, Liquidity } from '../';
import { Token__factory, AMMPool__factory } from '@typechain-types';
import { config } from '../../config';

export const ConnectedDashboard = () => {
  return (
    <BalanceProvider>
      <DashboardContent />
    </BalanceProvider>
  );
};

const DashboardContent = () => {
  const { account, isCheckingConnection, signer } = useWallet();
  const { ethBalance, tokenBalance, poolEthBalance, poolTokenBalance, refreshAllBalances } = useBalances();
  const [tokenSymbol, setTokenSymbol] = useState<string>('');

  // Fetch token symbol from contract
  useEffect(() => {
    const fetchTokenInfo = async () => {
      if (!signer) return;
      
      try {
        const tokenContract = Token__factory.connect(config.contracts.tokenAddress, signer);
        const symbol = await tokenContract.symbol();
        setTokenSymbol(symbol);
      } catch (error) {
        throw new Error(`Failed to fetch token information: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    };

    fetchTokenInfo();
  }, [signer]);

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
        ethBalance={ethBalance}
        tokenBalance={tokenBalance}
        tokenSymbol={tokenSymbol}
        isCheckingConnection={isCheckingConnection}
      />

      <ContractsSection 
        poolEthBalance={poolEthBalance}
        poolTokenBalance={poolTokenBalance}
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