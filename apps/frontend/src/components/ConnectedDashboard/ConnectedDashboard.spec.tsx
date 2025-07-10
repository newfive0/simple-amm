import { render, screen, waitFor, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ethers } from 'ethers';
import { ConnectedDashboard } from './ConnectedDashboard';

// Mock balance utilities
vi.mock('../../utils/balances', () => ({
  getPoolReserves: vi.fn(),
  ensureTokenSymbolIsSIMP: vi.fn(),
  getLiquidityBalances: vi.fn(),
}));

// Mock error message context
const mockSetErrorMessage = vi.fn();
vi.mock('../../contexts/ErrorMessageContext', () => ({
  useErrorMessage: () => ({
    setErrorMessage: mockSetErrorMessage,
  }),
}));

// Mock the child components

interface MockSwapProps {
  ammContract: unknown;
  tokenContract: unknown;
  poolEthReserve: bigint;
  poolTokenReserve: bigint;
  onSwapComplete: () => void;
}

interface MockLiquidityProps {
  ammContract: unknown;
  tokenContract: unknown;
  poolEthReserve: bigint;
  poolTokenReserve: bigint;
  lpTokenBalances: {
    userLPTokens: number;
    totalLPTokens: number;
    poolOwnershipPercentage: number;
  };
  onLiquidityComplete: () => void;
}

vi.mock('../WalletInfo/WalletInfo', () => ({
  WalletInfo: ({ account }: { account: string }) => (
    <div data-testid="wallet-info">{account || 'Not Connected'}</div>
  ),
}));

vi.mock('../Swap/Swap', () => ({
  Swap: ({
    poolEthReserve,
    poolTokenReserve,
    onSwapComplete,
  }: MockSwapProps) => (
    <div data-testid="swap">
      <div>
        Pool: {parseFloat(ethers.formatUnits(poolEthReserve, 18)).toFixed(4)}{' '}
        ETH / {parseFloat(ethers.formatUnits(poolTokenReserve, 18)).toFixed(4)}{' '}
        SIMP
      </div>
      <button onClick={onSwapComplete}>Complete Swap</button>
    </div>
  ),
}));

vi.mock('../Liquidity/Liquidity', () => ({
  Liquidity: ({
    poolEthReserve,
    poolTokenReserve,
    lpTokenBalances,
    onLiquidityComplete,
  }: MockLiquidityProps) => (
    <div data-testid="liquidity">
      <div>
        Pool: {parseFloat(ethers.formatUnits(poolEthReserve, 18)).toFixed(4)}{' '}
        ETH / {parseFloat(ethers.formatUnits(poolTokenReserve, 18)).toFixed(4)}{' '}
        SIMP
      </div>
      <div>LP Tokens: {lpTokenBalances.userLPTokens.toFixed(4)}</div>
      <button onClick={onLiquidityComplete}>Complete Liquidity</button>
    </div>
  ),
}));

// Mock TypeChain factories
const mockTokenContract = { symbol: vi.fn() };
const mockAmmContract = { reserveETH: vi.fn(), reserveSimplest: vi.fn() };

vi.mock('@typechain-types', () => ({
  Token__factory: {
    connect: vi.fn(() => mockTokenContract),
  },
  AMMPool__factory: {
    connect: vi.fn(() => mockAmmContract),
  },
}));

// Mock wallet context
const mockEthereumProvider = { getBalance: vi.fn() };
const mockSigner = { getAddress: vi.fn() } as unknown as ethers.JsonRpcSigner;

const mockWalletContext = {
  account: '0x1234567890abcdef1234567890abcdef12345678',
  signer: mockSigner,
  ethereumProvider: mockEthereumProvider,
  errorMessage: '',
  connectWallet: vi.fn(),
};

vi.mock('../../contexts', () => ({
  useWallet: () => mockWalletContext,
}));

// Import mocked functions
import {
  getPoolReserves,
  ensureTokenSymbolIsSIMP,
  getLiquidityBalances,
} from '../../utils/balances';

const mockGetPoolReserves = vi.mocked(getPoolReserves);
const mockEnsureTokenSymbolIsSIMP = vi.mocked(ensureTokenSymbolIsSIMP);
const mockGetLiquidityBalances = vi.mocked(getLiquidityBalances);

describe('ConnectedDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Reset wallet context to default state
    mockWalletContext.signer = mockSigner;

    // Setup default mock returns
    mockGetPoolReserves.mockResolvedValue({
      ethReserve: BigInt(10e18),
      tokenReserve: BigInt(20e18),
    });

    mockGetLiquidityBalances.mockResolvedValue({
      userLPTokens: 5.0,
      totalLPTokens: 10.0,
      poolOwnershipPercentage: 50.0,
    });

    mockEnsureTokenSymbolIsSIMP.mockResolvedValue();
  });

  describe('Rendering', () => {
    it('should render WalletInfo and contract components', async () => {
      render(<ConnectedDashboard />);

      // Wait for async useEffect to complete before checking anything
      await waitFor(() => {
        expect(screen.getByTestId('wallet-info')).toBeInTheDocument();
        expect(screen.getByTestId('swap')).toBeInTheDocument();
        expect(screen.getByTestId('liquidity')).toBeInTheDocument();
      });
    });

    it('should pass correct props to WalletInfo component', async () => {
      render(<ConnectedDashboard />);

      // Wait for async balance fetching to complete
      await waitFor(() => {
        expect(
          screen.getByText('0x1234567890abcdef1234567890abcdef12345678')
        ).toBeInTheDocument();
      });
    });

    it('should pass correct props to Swap and Liquidity components', async () => {
      render(<ConnectedDashboard />);

      // Wait for async balance fetching to complete
      await waitFor(() => {
        const swapElements = screen.getAllByText(
          'Pool: 10.0000 ETH / 20.0000 SIMP'
        );
        expect(swapElements).toHaveLength(2); // One for Swap, one for Liquidity
      });
    });
  });

  describe('Balance Fetching', () => {
    it('should fetch balances and token symbol on mount', async () => {
      render(<ConnectedDashboard />);

      await waitFor(() => {
        expect(mockGetPoolReserves).toHaveBeenCalledWith(mockSigner);
        expect(mockGetLiquidityBalances).toHaveBeenCalledWith(
          mockSigner,
          mockWalletContext.account
        );
        expect(mockEnsureTokenSymbolIsSIMP).toHaveBeenCalledWith(mockSigner);
      });
    });

    it('should handle missing wallet dependencies gracefully', async () => {
      const originalSigner = mockWalletContext.signer;
      // @ts-expect-error - Testing null signer case
      mockWalletContext.signer = null;

      render(<ConnectedDashboard />);

      // Wait for async useEffect to complete (even though it does nothing with null signer)
      await waitFor(() => {
        // Should show account in WalletInfo and "Wallet not connected" for contracts
        expect(
          screen.getByText('0x1234567890abcdef1234567890abcdef12345678')
        ).toBeInTheDocument();
        expect(screen.getByText('Wallet not connected')).toBeInTheDocument();
      });

      // Should not call balance utilities when signer is missing
      expect(mockGetPoolReserves).not.toHaveBeenCalled();
      expect(mockGetLiquidityBalances).not.toHaveBeenCalled();
      expect(mockEnsureTokenSymbolIsSIMP).not.toHaveBeenCalled();

      mockWalletContext.signer = originalSigner;
    });

    it('should update components when token symbol is fetched', async () => {
      // Ensure signer is available
      mockWalletContext.signer = mockSigner;
      mockEnsureTokenSymbolIsSIMP.mockResolvedValue();

      render(<ConnectedDashboard />);

      await waitFor(() => {
        expect(
          screen.getByText('0x1234567890abcdef1234567890abcdef12345678')
        ).toBeInTheDocument();
      });
    });
  });

  describe('Callback Handling', () => {
    beforeEach(() => {
      // Ensure signer is available for these tests
      mockWalletContext.signer = mockSigner;
    });

    it('should refresh balances when swap completes', async () => {
      render(<ConnectedDashboard />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Complete Swap')).toBeInTheDocument();
      });

      // Clear previous calls
      vi.clearAllMocks();

      // Setup new mock values
      mockGetPoolReserves.mockResolvedValue({
        ethReserve: BigInt(9e18),
        tokenReserve: BigInt(22e18),
      });
      mockGetLiquidityBalances.mockResolvedValue({
        userLPTokens: 4.5,
        totalLPTokens: 10.0,
        poolOwnershipPercentage: 45.0,
      });

      act(() => {
        screen.getByText('Complete Swap').click();
      });

      await waitFor(() => {
        expect(mockGetPoolReserves).toHaveBeenCalled();
        expect(mockGetLiquidityBalances).toHaveBeenCalled();
        expect(mockEnsureTokenSymbolIsSIMP).toHaveBeenCalled();
      });
    });

    it('should refresh balances when liquidity operation completes', async () => {
      render(<ConnectedDashboard />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Complete Liquidity')).toBeInTheDocument();
      });

      // Clear previous calls
      vi.clearAllMocks();

      act(() => {
        screen.getByText('Complete Liquidity').click();
      });

      await waitFor(() => {
        expect(mockGetPoolReserves).toHaveBeenCalled();
        expect(mockGetLiquidityBalances).toHaveBeenCalled();
        expect(mockEnsureTokenSymbolIsSIMP).toHaveBeenCalled();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle balance fetching errors gracefully', async () => {
      // Ensure signer is available for this test
      mockWalletContext.signer = mockSigner;

      mockGetPoolReserves.mockRejectedValue(new Error('Network error'));
      mockGetLiquidityBalances.mockResolvedValue({
        userLPTokens: 5.0,
        totalLPTokens: 10.0,
        poolOwnershipPercentage: 50.0,
      });
      mockEnsureTokenSymbolIsSIMP.mockResolvedValue();

      render(<ConnectedDashboard />);

      await waitFor(() => {
        expect(mockSetErrorMessage).toHaveBeenCalledWith(
          expect.stringContaining('Network error')
        );
      });
    });

    it('should clear errors on successful balance fetching', async () => {
      // Ensure signer is available for this test
      mockWalletContext.signer = mockSigner;

      render(<ConnectedDashboard />);

      await waitFor(() => {
        expect(mockSetErrorMessage).toHaveBeenCalledWith('');
      });
    });
  });
});
