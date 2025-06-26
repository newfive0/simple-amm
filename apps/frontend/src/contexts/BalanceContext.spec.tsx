import { render, screen, waitFor, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { BalanceProvider, useBalances } from './BalanceContext';
import { createMockContracts } from '../test-mocks';

// Create test component to consume context
const TestComponent = () => {
  const {
    ethBalance,
    tokenBalance,
    poolEthBalance,
    poolTokenBalance,
    refreshBalances,
    refreshPoolBalances,
    refreshAllBalances,
  } = useBalances();

  return (
    <div>
      <div data-testid="eth-balance">{ethBalance}</div>
      <div data-testid="token-balance">{tokenBalance}</div>
      <div data-testid="pool-eth-balance">{poolEthBalance}</div>
      <div data-testid="pool-token-balance">{poolTokenBalance}</div>
      <button onClick={refreshBalances} data-testid="refresh-balances">
        Refresh Balances
      </button>
      <button onClick={refreshPoolBalances} data-testid="refresh-pool-balances">
        Refresh Pool Balances
      </button>
      <button onClick={refreshAllBalances} data-testid="refresh-all-balances">
        Refresh All Balances
      </button>
    </div>
  );
};

// Mock wallet context
const mockEthereumProvider = {
  getBalance: vi.fn(),
};

const mockWalletContext = {
  ethereumProvider: mockEthereumProvider,
  account: '0x1234567890abcdef1234567890abcdef12345678',
};

// Mock contract context
const { mockTokenContract, mockAmmContract, tokenContract, ammContract } = createMockContracts();
const mockContractContext = {
  tokenContract,
  ammContract,
};

vi.mock('./WalletContext', () => ({
  useWallet: () => mockWalletContext,
}));

vi.mock('./ContractContext', () => ({
  useContracts: () => mockContractContext,
}));

describe('BalanceContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset wallet context to default connected state
    mockWalletContext.ethereumProvider = mockEthereumProvider;
    mockWalletContext.account = '0x1234567890abcdef1234567890abcdef12345678';
    mockContractContext.ammContract = ammContract;
    
    // Set up default mock returns
    mockEthereumProvider.getBalance.mockResolvedValue(BigInt(5 * 1e18)); // 5 ETH
    mockTokenContract.balanceOf.mockResolvedValue(BigInt(1000 * 1e18)); // 1000 tokens
    mockAmmContract.reserveETH.mockResolvedValue(BigInt(10 * 1e18)); // 10 ETH in pool
    mockAmmContract.reserveSimplest.mockResolvedValue(BigInt(20 * 1e18)); // 20 tokens in pool
  });

  describe('Provider Setup', () => {
    it('should provide initial balance values', () => {
      // Prevent useEffect from completing by making promises never resolve
      mockEthereumProvider.getBalance.mockReturnValue(new Promise(() => {}));
      mockTokenContract.balanceOf.mockReturnValue(new Promise(() => {}));
      mockAmmContract.reserveETH.mockReturnValue(new Promise(() => {}));
      mockAmmContract.reserveSimplest.mockReturnValue(new Promise(() => {}));

      render(
        <BalanceProvider>
          <TestComponent />
        </BalanceProvider>
      );

      // Should start with zero balances before any async operations complete
      expect(screen.getByTestId('eth-balance')).toHaveTextContent('0');
      expect(screen.getByTestId('token-balance')).toHaveTextContent('0');
      expect(screen.getByTestId('pool-eth-balance')).toHaveTextContent('0');
      expect(screen.getByTestId('pool-token-balance')).toHaveTextContent('0');
    });

    it('should throw error when useBalances is used outside provider', () => {
      // Suppress React error logging for this expected error
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      expect(() => render(<TestComponent />)).toThrow(
        'useBalances must be used within a BalanceProvider'
      );

      consoleErrorSpy.mockRestore();
    });

    it('should throw error when ethereumProvider is missing', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const originalEthereumProvider = mockWalletContext.ethereumProvider;
      
      // @ts-expect-error - Testing null provider case
      mockWalletContext.ethereumProvider = null;

      expect(() => 
        render(
          <BalanceProvider>
            <TestComponent />
          </BalanceProvider>
        )
      ).toThrow('BalanceProvider requires an Ethereum provider. Please connect your wallet.');

      mockWalletContext.ethereumProvider = originalEthereumProvider;
      consoleErrorSpy.mockRestore();
    });

    it('should throw error when account is missing', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const originalAccount = mockWalletContext.account;
      
      mockWalletContext.account = '';

      expect(() => 
        render(
          <BalanceProvider>
            <TestComponent />
          </BalanceProvider>
        )
      ).toThrow('BalanceProvider requires an account. Please connect your wallet.');

      mockWalletContext.account = originalAccount;
      consoleErrorSpy.mockRestore();
    });

    it('should throw error when token contract is missing', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const originalTokenContract = mockContractContext.tokenContract;
      
      // @ts-expect-error - Testing null contract case
      mockContractContext.tokenContract = null;

      expect(() => 
        render(
          <BalanceProvider>
            <TestComponent />
          </BalanceProvider>
        )
      ).toThrow('BalanceProvider requires a token contract. Please ensure contracts are loaded.');

      mockContractContext.tokenContract = originalTokenContract;
      consoleErrorSpy.mockRestore();
    });

    it('should throw error when AMM contract is missing', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const originalAmmContract = mockContractContext.ammContract;
      
      // @ts-expect-error - Testing null contract case
      mockContractContext.ammContract = null;

      expect(() => 
        render(
          <BalanceProvider>
            <TestComponent />
          </BalanceProvider>
        )
      ).toThrow('BalanceProvider requires an AMM contract. Please ensure contracts are loaded.');

      mockContractContext.ammContract = originalAmmContract;
      consoleErrorSpy.mockRestore();
    });
  });

  describe('Balance Fetching', () => {
    it('should fetch and update all balances automatically on mount', async () => {
      render(
        <BalanceProvider>
          <TestComponent />
        </BalanceProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('eth-balance')).toHaveTextContent('5');
        expect(screen.getByTestId('token-balance')).toHaveTextContent('1000');
        expect(screen.getByTestId('pool-eth-balance')).toHaveTextContent('10');
        expect(screen.getByTestId('pool-token-balance')).toHaveTextContent('20');
      });

      expect(mockEthereumProvider.getBalance).toHaveBeenCalledWith(mockWalletContext.account);
      expect(mockTokenContract.balanceOf).toHaveBeenCalledWith(mockWalletContext.account);
      expect(mockAmmContract.reserveETH).toHaveBeenCalled();
      expect(mockAmmContract.reserveSimplest).toHaveBeenCalled();
    });
  });

  describe('Manual Refresh Functions', () => {
    it('should refresh user balances when refreshBalances is called', async () => {
      render(
        <BalanceProvider>
          <TestComponent />
        </BalanceProvider>
      );

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByTestId('eth-balance')).toHaveTextContent('5');
      });

      // Update mock values
      mockEthereumProvider.getBalance.mockResolvedValue(BigInt(8 * 1e18)); // 8 ETH
      mockTokenContract.balanceOf.mockResolvedValue(BigInt(500 * 1e18)); // 500 tokens

      // Trigger refresh
      act(() => {
        screen.getByTestId('refresh-balances').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('eth-balance')).toHaveTextContent('8');
        expect(screen.getByTestId('token-balance')).toHaveTextContent('500');
      });
    });

    it('should refresh pool balances when refreshPoolBalances is called', async () => {
      render(
        <BalanceProvider>
          <TestComponent />
        </BalanceProvider>
      );

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByTestId('pool-eth-balance')).toHaveTextContent('10');
      });

      // Update mock values
      mockAmmContract.reserveETH.mockResolvedValue(BigInt(15 * 1e18)); // 15 ETH
      mockAmmContract.reserveSimplest.mockResolvedValue(BigInt(30 * 1e18)); // 30 tokens

      // Trigger refresh
      act(() => {
        screen.getByTestId('refresh-pool-balances').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('pool-eth-balance')).toHaveTextContent('15');
        expect(screen.getByTestId('pool-token-balance')).toHaveTextContent('30');
      });
    });

    it('should refresh all balances when refreshAllBalances is called', async () => {
      render(
        <BalanceProvider>
          <TestComponent />
        </BalanceProvider>
      );

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByTestId('eth-balance')).toHaveTextContent('5');
      });

      // Update all mock values
      mockEthereumProvider.getBalance.mockResolvedValue(BigInt(12 * 1e18));
      mockTokenContract.balanceOf.mockResolvedValue(BigInt(2000 * 1e18));
      mockAmmContract.reserveETH.mockResolvedValue(BigInt(25 * 1e18));
      mockAmmContract.reserveSimplest.mockResolvedValue(BigInt(50 * 1e18));

      // Trigger refresh all
      act(() => {
        screen.getByTestId('refresh-all-balances').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('eth-balance')).toHaveTextContent('12');
        expect(screen.getByTestId('token-balance')).toHaveTextContent('2000');
        expect(screen.getByTestId('pool-eth-balance')).toHaveTextContent('25');
        expect(screen.getByTestId('pool-token-balance')).toHaveTextContent('50');
      });
    });
  });

  describe('Error Handling', () => {
    it('should show alert for user balance fetch errors', async () => {
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      mockEthereumProvider.getBalance.mockRejectedValue(new Error('Network error'));
      mockTokenContract.balanceOf.mockRejectedValue(new Error('Contract error'));

      render(
        <BalanceProvider>
          <TestComponent />
        </BalanceProvider>
      );

      // Should show alert when errors occur
      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('Failed to refresh balances: Network error');
      });

      expect(screen.getByTestId('eth-balance')).toHaveTextContent('0');
      expect(screen.getByTestId('token-balance')).toHaveTextContent('0');
      
      alertSpy.mockRestore();
    });

    it('should show alert for pool balance fetch errors', async () => {
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      mockAmmContract.reserveETH.mockRejectedValue(new Error('Contract error'));
      mockAmmContract.reserveSimplest.mockRejectedValue(new Error('Contract error'));

      render(
        <BalanceProvider>
          <TestComponent />
        </BalanceProvider>
      );

      // Should show alert when errors occur
      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('Failed to refresh pool balances: Contract error');
      });

      expect(screen.getByTestId('pool-eth-balance')).toHaveTextContent('0');
      expect(screen.getByTestId('pool-token-balance')).toHaveTextContent('0');
      
      alertSpy.mockRestore();
    });
  });

  describe('Wallet State Changes', () => {
    it('should handle wallet disconnection by throwing error (caught by ErrorBoundary)', () => {
      // In a real app, when account becomes empty, the App component would not render 
      // ConnectedDashboard (which contains BalanceProvider). 
      // But if somehow BalanceProvider renders with no account, it should throw an error.
      
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const originalAccount = mockWalletContext.account;
      
      mockWalletContext.account = '';

      expect(() => 
        render(
          <BalanceProvider>
            <TestComponent />
          </BalanceProvider>
        )
      ).toThrow('BalanceProvider requires an account. Please connect your wallet.');

      mockWalletContext.account = originalAccount;
      consoleErrorSpy.mockRestore();
    });
  });
});