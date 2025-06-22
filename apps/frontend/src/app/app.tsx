import { useWallet, useContracts, useReadyContracts, useBalances, useLoading } from '../contexts';
import { WalletInfo, Swap, Liquidity } from '../components';

export const App = () => {
  const { account, isCheckingConnection, showCheckingMessage, networkError, connectWallet } = useWallet();
  const { tokenSymbol, contractsReady } = useContracts();
  const { ethBalance, tokenBalance, poolEthBalance, poolTokenBalance, refreshAllBalances } = useBalances();
  const { isLoading, setIsLoading } = useLoading();

  const handleSwapComplete = async () => {
    await refreshAllBalances();
  };

  const handleLiquidityComplete = async () => {
    await refreshAllBalances();
  };

  if (isCheckingConnection) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center' 
      }}>
        {showCheckingMessage && <div>Checking wallet connection...</div>}
      </div>
    );
  }

  if (networkError) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        <div style={{ color: 'red', textAlign: 'center' }}>
          {networkError}
        </div>
        <button onClick={() => window.location.reload()}>
          Reload Page
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Simple AMM</h1>
      
      {!account ? (
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          gap: '1rem' 
        }}>
          <p>Connect your wallet to start trading</p>
          <button 
            onClick={connectWallet}
            disabled={isLoading}
            style={{
              padding: '12px 24px',
              fontSize: '16px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.6 : 1,
            }}
          >
            {isLoading ? 'Connecting...' : 'Connect Wallet'}
          </button>
        </div>
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