import { useWallet, useContracts, useReadyContracts, useBalances, useLoading } from '../contexts';
import { WalletInfo, Swap, Liquidity, ConnectWallet } from '../components';

export const App = () => {
  const { account, isCheckingConnection, connectWallet } = useWallet();
  const { tokenSymbol, contractsReady } = useContracts();
  const { ethBalance, tokenBalance, poolEthBalance, poolTokenBalance, refreshAllBalances } = useBalances();
  const { isLoading, setIsLoading } = useLoading();

  const handleSwapComplete = async () => {
    await refreshAllBalances();
  };

  const handleLiquidityComplete = async () => {
    await refreshAllBalances();
  };

  const handleConnectWallet = async () => {
    setIsLoading(true);
    try {
      await connectWallet();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Simple AMM</h1>
      
      {!account ? (
        <ConnectWallet onConnect={handleConnectWallet} isLoading={isLoading} />
      ) : (
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

          {contractsReady && <ContractsSection 
            poolEthBalance={poolEthBalance}
            poolTokenBalance={poolTokenBalance}
            tokenSymbol={tokenSymbol}
            isLoading={isLoading}
            setIsLoading={setIsLoading}
            onSwapComplete={handleSwapComplete}
            onLiquidityComplete={handleLiquidityComplete}
          />}
        </div>
      )}
    </div>
  );
}

interface ContractsSectionProps {
  poolEthBalance: string;
  poolTokenBalance: string;
  tokenSymbol: string;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  onSwapComplete: () => Promise<void>;
  onLiquidityComplete: () => Promise<void>;
}

const ContractsSection = ({
  poolEthBalance,
  poolTokenBalance,
  tokenSymbol,
  isLoading,
  setIsLoading,
  onSwapComplete,
  onLiquidityComplete,
}: ContractsSectionProps) => {
  const { ammContract, tokenContract, contractAddresses } = useReadyContracts();

  return (
    <>
      <Swap
        ammContract={ammContract}
        tokenContract={tokenContract}
        contractAddresses={contractAddresses}
        poolEthBalance={poolEthBalance}
        poolTokenBalance={poolTokenBalance}
        tokenSymbol={tokenSymbol}
        isLoading={isLoading}
        setIsLoading={setIsLoading}
        onSwapComplete={onSwapComplete}
      />

      <Liquidity
        ammContract={ammContract}
        tokenContract={tokenContract}
        contractAddresses={contractAddresses}
        poolEthBalance={poolEthBalance}
        poolTokenBalance={poolTokenBalance}
        tokenSymbol={tokenSymbol}
        isLoading={isLoading}
        setIsLoading={setIsLoading}
        onLiquidityComplete={onLiquidityComplete}
      />
    </>
  );
}

export default App;