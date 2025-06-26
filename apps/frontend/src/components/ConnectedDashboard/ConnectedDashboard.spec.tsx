import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ConnectedDashboard } from './ConnectedDashboard';
import { createMockContracts } from '../../test-mocks';

// Mock the child components
interface MockWalletInfoProps {
  account: string;
  ethBalance: string;
  tokenBalance: string;
  tokenSymbol: string;
  isCheckingConnection: boolean;
}

interface MockSwapProps {
  poolEthBalance: string;
  poolTokenBalance: string;
  tokenSymbol: string;
  onSwapComplete: () => void;
}

interface MockLiquidityProps {
  poolEthBalance: string;
  poolTokenBalance: string;
  tokenSymbol: string;
  onLiquidityComplete: () => void;
}

vi.mock('../WalletInfo/WalletInfo', () => ({
  WalletInfo: ({ account, ethBalance, tokenBalance, tokenSymbol, isCheckingConnection }: MockWalletInfoProps) => (
    <div data-testid="wallet-info">
      {isCheckingConnection ? 'Checking...' : `${account} - ${ethBalance} ETH / ${tokenBalance} ${tokenSymbol}`}
    </div>
  ),
}));

vi.mock('../Swap/Swap', () => ({
  Swap: ({ poolEthBalance, poolTokenBalance, tokenSymbol, onSwapComplete }: MockSwapProps) => (
    <div data-testid="swap">
      <div>Pool: {poolEthBalance} ETH / {poolTokenBalance} {tokenSymbol}</div>
      <button onClick={onSwapComplete}>Complete Swap</button>
    </div>
  ),
}));

vi.mock('../Liquidity/Liquidity', () => ({
  Liquidity: ({ poolEthBalance, poolTokenBalance, tokenSymbol, onLiquidityComplete }: MockLiquidityProps) => (
    <div data-testid="liquidity">
      <div>Pool: {poolEthBalance} ETH / {poolTokenBalance} {tokenSymbol}</div>
      <button onClick={onLiquidityComplete}>Complete Liquidity</button>
    </div>
  ),
}));

// Mock the contexts
const mockWalletContext = {
  account: '0x1234567890abcdef1234567890abcdef12345678',
  isCheckingConnection: false,
};

const mockBalancesContext = {
  ethBalance: '5.0',
  tokenBalance: '1000.0',
  poolEthBalance: '10.0',
  poolTokenBalance: '20.0',
  refreshAllBalances: vi.fn().mockResolvedValue(undefined),
};

const { mockTokenContract, tokenContract, ammContract } = createMockContracts();
const mockContractsContext = {
  tokenContract,
  ammContract,
  contractAddresses: { tokenAddress: '0x123', ammPoolAddress: '0x456' },
};

interface MockProviderProps {
  children: React.ReactNode;
}

vi.mock('../../contexts', () => ({
  useWallet: () => mockWalletContext,
  useBalances: () => mockBalancesContext,
  useContracts: () => mockContractsContext,
  ContractProvider: ({ children }: MockProviderProps) => <div data-testid="contract-provider">{children}</div>,
  BalanceProvider: ({ children }: MockProviderProps) => <div data-testid="balance-provider">{children}</div>,
}));

describe('ConnectedDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTokenContract.symbol.mockResolvedValue('SIMP');
  });

  describe('Rendering', () => {
    it('should render all main components', async () => {
      render(<ConnectedDashboard />);

      expect(screen.getByTestId('contract-provider')).toBeInTheDocument();
      expect(screen.getByTestId('balance-provider')).toBeInTheDocument();
      expect(screen.getByTestId('wallet-info')).toBeInTheDocument();
      expect(screen.getByTestId('swap')).toBeInTheDocument();
      expect(screen.getByTestId('liquidity')).toBeInTheDocument();
    });

    it('should pass correct props to WalletInfo component', async () => {
      render(<ConnectedDashboard />);

      await waitFor(() => {
        expect(screen.getByText(/0x1234567890abcdef1234567890abcdef12345678 - 5\.0 ETH \/ 1000\.0 SIMP/)).toBeInTheDocument();
      });
    });

    it('should pass correct props to Swap and Liquidity components', async () => {
      render(<ConnectedDashboard />);

      await waitFor(() => {
        const swapElements = screen.getAllByText('Pool: 10.0 ETH / 20.0 SIMP');
        expect(swapElements).toHaveLength(2); // One for Swap, one for Liquidity
      });
    });
  });

  describe('Token Symbol Fetching', () => {
    it('should fetch token symbol on mount', async () => {
      render(<ConnectedDashboard />);

      await waitFor(() => {
        expect(mockTokenContract.symbol).toHaveBeenCalled();
      });
    });


    it('should update components when token symbol is fetched', async () => {
      mockTokenContract.symbol.mockResolvedValue('CUSTOM');

      render(<ConnectedDashboard />);

      await waitFor(() => {
        expect(screen.getByText(/1000\.0 CUSTOM/)).toBeInTheDocument();
      });
    });
  });

  describe('Callback Handling', () => {
    it('should call refreshAllBalances when swap completes', async () => {
      render(<ConnectedDashboard />);

      const swapButton = screen.getByText('Complete Swap');
      swapButton.click();

      await waitFor(() => {
        expect(mockBalancesContext.refreshAllBalances).toHaveBeenCalled();
      });
    });

    it('should call refreshAllBalances when liquidity operation completes', async () => {
      render(<ConnectedDashboard />);

      const liquidityButton = screen.getByText('Complete Liquidity');
      liquidityButton.click();

      await waitFor(() => {
        expect(mockBalancesContext.refreshAllBalances).toHaveBeenCalled();
      });
    });
  });

  describe('Loading States', () => {
    it('should show checking connection state in WalletInfo', async () => {
      mockWalletContext.isCheckingConnection = true;

      render(<ConnectedDashboard />);

      expect(screen.getByText('Checking...')).toBeInTheDocument();
    });
  });

  describe('Provider Structure', () => {
    it('should wrap content with ContractProvider and BalanceProvider', () => {
      render(<ConnectedDashboard />);

      const contractProvider = screen.getByTestId('contract-provider');
      const balanceProvider = screen.getByTestId('balance-provider');
      const walletInfo = screen.getByTestId('wallet-info');

      expect(contractProvider).toContainElement(balanceProvider);
      expect(balanceProvider).toContainElement(walletInfo);
    });
  });
});