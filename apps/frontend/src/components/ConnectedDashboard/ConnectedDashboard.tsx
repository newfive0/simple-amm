import { useState, useEffect } from 'react';
import { useWallet, useContracts, useBalances, ContractProvider, BalanceProvider } from '../../contexts';
import { WalletInfo, Swap, Liquidity } from '../';

export const ConnectedDashboard = () => {
  return (
    <ContractProvider>
      <BalanceProvider>
        <DashboardContent />
      </BalanceProvider>
    </ContractProvider>
  );
};

const DashboardContent = () => {
  const { account, isCheckingConnection } = useWallet();
  const { tokenContract } = useContracts();
  const { ethBalance, tokenBalance, poolEthBalance, poolTokenBalance, refreshAllBalances } = useBalances();
  const [tokenSymbol, setTokenSymbol] = useState<string>('');

  // Fetch token symbol from contract
  useEffect(() => {
    const fetchTokenInfo = async () => {
      try {
        const symbol = await tokenContract.symbol();
        setTokenSymbol(symbol);
      } catch (error) {
        throw new Error(`Failed to fetch token information: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    };

    fetchTokenInfo();
  }, [tokenContract]);

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
  const { ammContract, tokenContract, contractAddresses } = useContracts();

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