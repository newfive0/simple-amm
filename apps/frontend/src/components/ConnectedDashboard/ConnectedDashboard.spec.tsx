import { render, screen, waitFor, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ethers } from 'ethers';
import { ConnectedDashboard } from './ConnectedDashboard';

// Mock balance utilities
vi.mock('../../utils/balances', () => ({
  getWalletBalances: vi.fn(),
  getPoolBalances: vi.fn(),
  getTokenSymbol: vi.fn(),
}));

// Mock the child components
interface MockWalletInfoProps {
  account: string;
  ethBalance: number;
  tokenBalance: number;
  tokenSymbol: string;
}

interface MockSwapProps {
  ammContract: unknown;
  tokenContract: unknown;
  contractAddresses: { tokenAddress: string; ammPoolAddress: string };
  poolEthBalance: number;
  poolTokenBalance: number;
  tokenSymbol: string;
  onSwapComplete: () => void;
}

interface MockLiquidityProps {
  ammContract: unknown;
  tokenContract: unknown;
  contractAddresses: { tokenAddress: string; ammPoolAddress: string };
  poolEthBalance: number;
  poolTokenBalance: number;
  tokenSymbol: string;
  onLiquidityComplete: () => void;
}

vi.mock('../WalletInfo/WalletInfo', () => ({
  WalletInfo: ({ account, ethBalance, tokenBalance, tokenSymbol }: MockWalletInfoProps) => (
    <div data-testid="wallet-info">
      {account ? `${account} - ${ethBalance.toFixed(4)} ETH / ${tokenBalance.toFixed(4)} ${tokenSymbol}` : 'Not connected'}
    </div>
  ),
}));

vi.mock('../Swap/Swap', () => ({
  Swap: ({ poolEthBalance, poolTokenBalance, tokenSymbol, onSwapComplete }: MockSwapProps) => (
    <div data-testid="swap">
      <div>Pool: {poolEthBalance.toFixed(4)} ETH / {poolTokenBalance.toFixed(4)} {tokenSymbol}</div>
      <button onClick={onSwapComplete}>Complete Swap</button>
    </div>
  ),
}));

vi.mock('../Liquidity/Liquidity', () => ({
  Liquidity: ({ poolEthBalance, poolTokenBalance, tokenSymbol, onLiquidityComplete }: MockLiquidityProps) => (
    <div data-testid="liquidity">
      <div>Pool: {poolEthBalance.toFixed(4)} ETH / {poolTokenBalance.toFixed(4)} {tokenSymbol}</div>
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
  errorMessage: "",
  connectWallet: vi.fn(),
};

vi.mock('../../contexts', () => ({
  useWallet: () => mockWalletContext,
}));

// Import mocked functions  
import { getWalletBalances, getPoolBalances, getTokenSymbol } from '../../utils/balances';

const mockGetWalletBalances = vi.mocked(getWalletBalances);
const mockGetPoolBalances = vi.mocked(getPoolBalances);
const mockGetTokenSymbol = vi.mocked(getTokenSymbol);

describe('ConnectedDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset wallet context to default state
    mockWalletContext.signer = mockSigner;
    
    // Setup default mock returns
    mockGetWalletBalances.mockResolvedValue({
      ethBalance: 5.0,
      tokenBalance: 1000.0,
    });
    
    mockGetPoolBalances.mockResolvedValue({
      ethReserve: 10.0,
      tokenReserve: 20.0,
    });
    
    mockGetTokenSymbol.mockResolvedValue('SIMP');
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
        expect(screen.getByText(/0x1234567890abcdef1234567890abcdef12345678 - 5\.0000 ETH \/ 1000\.0000 SIMP/)).toBeInTheDocument();
      });
    });

    it('should pass correct props to Swap and Liquidity components', async () => {
      render(<ConnectedDashboard />);

      // Wait for async balance fetching to complete
      await waitFor(() => {
        const swapElements = screen.getAllByText('Pool: 10.0000 ETH / 20.0000 SIMP');
        expect(swapElements).toHaveLength(2); // One for Swap, one for Liquidity
      });
    });
  });

  describe('Balance Fetching', () => {
    it('should fetch balances and token symbol on mount', async () => {
      render(<ConnectedDashboard />);

      await waitFor(() => {
        expect(mockGetWalletBalances).toHaveBeenCalledWith(
          mockEthereumProvider,
          mockWalletContext.account,
          mockSigner
        );
        expect(mockGetPoolBalances).toHaveBeenCalledWith(mockSigner);
        expect(mockGetTokenSymbol).toHaveBeenCalledWith(mockSigner);
      });
    });

    it('should handle missing wallet dependencies gracefully', async () => {
      const originalSigner = mockWalletContext.signer;
      // @ts-expect-error - Testing null signer case
      mockWalletContext.signer = null;

      render(<ConnectedDashboard />);

      // Wait for async useEffect to complete (even though it does nothing with null signer)
      await waitFor(() => {
        // Should show zero balances in WalletInfo and "Wallet not connected" for contracts
        expect(screen.getByText('0x1234567890abcdef1234567890abcdef12345678 - 0.0000 ETH / 0.0000')).toBeInTheDocument();
        expect(screen.getByText('Wallet not connected')).toBeInTheDocument();
      });

      // Should not call balance utilities when signer is missing
      expect(mockGetWalletBalances).not.toHaveBeenCalled();
      expect(mockGetPoolBalances).not.toHaveBeenCalled();
      expect(mockGetTokenSymbol).not.toHaveBeenCalled();

      mockWalletContext.signer = originalSigner;
    });

    it('should update components when token symbol is fetched', async () => {
      // Ensure signer is available
      mockWalletContext.signer = mockSigner;
      mockGetTokenSymbol.mockResolvedValue('CUSTOM');
      mockGetWalletBalances.mockResolvedValue({
        ethBalance: 5.0,
        tokenBalance: 1000.0,
      });

      render(<ConnectedDashboard />);

      await waitFor(() => {
        expect(screen.getByText(/1000\.0000 CUSTOM/)).toBeInTheDocument();
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
      mockGetWalletBalances.mockResolvedValue({
        ethBalance: 4.0,
        tokenBalance: 1100.0,
      });

      act(() => {
        screen.getByText('Complete Swap').click();
      });

      await waitFor(() => {
        expect(mockGetWalletBalances).toHaveBeenCalled();
        expect(mockGetPoolBalances).toHaveBeenCalled();
        expect(mockGetTokenSymbol).toHaveBeenCalled();
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
        expect(mockGetWalletBalances).toHaveBeenCalled();
        expect(mockGetPoolBalances).toHaveBeenCalled();
        expect(mockGetTokenSymbol).toHaveBeenCalled();
      });
    });
  });


  describe('Error Handling', () => {
    it('should handle balance fetching errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      // Ensure signer is available for this test
      mockWalletContext.signer = mockSigner;
      
      mockGetWalletBalances.mockRejectedValue(new Error('Network error'));
      mockGetPoolBalances.mockResolvedValue({ ethReserve: 10.0, tokenReserve: 20.0 });
      mockGetTokenSymbol.mockResolvedValue('SIMP');

      render(<ConnectedDashboard />);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Failed to fetch balances: Network error');
      });

      consoleSpy.mockRestore();
    });
  });
});