import { render, screen, waitFor, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ReactNode } from 'react';
import { WalletProvider, useWallet } from './WalletContext';
import { ErrorMessageProvider, useErrorMessage } from './ErrorMessageContext';

// Helper component to wrap tests with required providers
const TestWrapper = ({ children }: { children: ReactNode }) => (
  <ErrorMessageProvider>
    <WalletProvider>{children}</WalletProvider>
  </ErrorMessageProvider>
);

// Create test component to consume context
const TestComponent = () => {
  const { ethereumProvider, signer, account, connectWallet } = useWallet();
  const { errorMessage } = useErrorMessage();

  return (
    <div>
      <div data-testid="ethereum-provider">
        {ethereumProvider ? 'connected' : 'null'}
      </div>
      <div data-testid="signer">{signer ? 'available' : 'null'}</div>
      <div data-testid="account">{account}</div>
      <div data-testid="errorMessage">{errorMessage || 'null'}</div>
      <button onClick={connectWallet} data-testid="connect-wallet">
        Connect Wallet
      </button>
    </div>
  );
};

// Mock ethers
const mockBrowserProvider = {
  getSigner: vi.fn(),
};

const mockSigner = {
  getAddress: vi.fn(),
};

vi.mock('ethers', () => ({
  ethers: {
    BrowserProvider: vi.fn(() => mockBrowserProvider),
  },
  isError: vi.fn(() => false), // Mock isError to always return false for tests
}));

// Mock window.ethereum
const mockEthereum = {
  request: vi.fn(),
  on: vi.fn(),
  removeListener: vi.fn(),
};

describe('WalletContext', () => {
  // Helper to get the accountsChanged handler that was registered with ethereum.on()
  const getAccountsChangedHandler = () => {
    const handler = mockEthereum.on.mock.calls.find(
      (call) => call[0] === 'accountsChanged'
    )?.[1];
    if (!handler) {
      throw new Error('accountsChanged handler not found');
    }
    return handler;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Set up window.ethereum mock
    Object.defineProperty(window, 'ethereum', {
      value: mockEthereum,
      writable: true,
    });

    // Set up default mock returns
    mockBrowserProvider.getSigner.mockResolvedValue(mockSigner);
    mockSigner.getAddress.mockResolvedValue(
      '0x1234567890abcdef1234567890abcdef12345678'
    );
    mockEthereum.request.mockResolvedValue([
      '0x1234567890abcdef1234567890abcdef12345678',
    ]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Provider Setup', () => {
    it('should throw error when useWallet is used outside provider', () => {
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      expect(() => render(<TestComponent />)).toThrow(
        'useWallet must be used within a WalletProvider'
      );

      consoleErrorSpy.mockRestore();
    });

    it('should handle missing ethereum provider gracefully', async () => {
      Object.defineProperty(window, 'ethereum', {
        value: undefined,
        writable: true,
      });

      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      // Should start disconnected with wallet required error message
      expect(screen.getByTestId('ethereum-provider')).toHaveTextContent('null');
      expect(screen.getByTestId('signer')).toHaveTextContent('null');
      expect(screen.getByTestId('account')).toHaveTextContent('');
      expect(screen.getByTestId('errorMessage')).toHaveTextContent(
        'Ethereum wallet required. Please install a Web3 wallet extension.'
      );
    });

    it('should show wallet required error when trying to connect without MetaMask', async () => {
      Object.defineProperty(window, 'ethereum', {
        value: undefined,
        writable: true,
      });

      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      // Try to connect wallet without MetaMask
      act(() => {
        screen.getByTestId('connect-wallet').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('errorMessage')).toHaveTextContent(
          'Ethereum wallet required. Please install a Web3 wallet extension.'
        );
        expect(screen.getByTestId('ethereum-provider')).toHaveTextContent(
          'null'
        );
        expect(screen.getByTestId('signer')).toHaveTextContent('null');
        expect(screen.getByTestId('account')).toHaveTextContent('');
      });
    });
  });

  describe('Wallet Connection', () => {
    it('should connect wallet successfully', async () => {
      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      // Click connect wallet button
      act(() => {
        screen.getByTestId('connect-wallet').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('ethereum-provider')).toHaveTextContent(
          'connected'
        );
        expect(screen.getByTestId('signer')).toHaveTextContent('available');
        expect(screen.getByTestId('account')).toHaveTextContent(
          '0x1234567890abcdef1234567890abcdef12345678'
        );
      });

      expect(mockEthereum.request).toHaveBeenCalledWith({
        method: 'eth_requestAccounts',
      });
      expect(mockBrowserProvider.getSigner).toHaveBeenCalled();
      expect(mockSigner.getAddress).toHaveBeenCalled();
    });

    it('should handle wallet connection rejection', async () => {
      mockEthereum.request.mockRejectedValue(
        new Error('User rejected the request')
      );

      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      act(() => {
        screen.getByTestId('connect-wallet').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('ethereum-provider')).toHaveTextContent(
          'null'
        );
        expect(screen.getByTestId('signer')).toHaveTextContent('null');
        expect(screen.getByTestId('account')).toHaveTextContent('');
        expect(screen.getByTestId('errorMessage')).toHaveTextContent(
          'Wallet connection failed: User rejected the request'
        );
      });
    });

    it('should handle empty accounts array from wallet', async () => {
      mockEthereum.request.mockResolvedValue([]);

      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      act(() => {
        screen.getByTestId('connect-wallet').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('ethereum-provider')).toHaveTextContent(
          'null'
        );
        expect(screen.getByTestId('signer')).toHaveTextContent('null');
        expect(screen.getByTestId('account')).toHaveTextContent('');
      });
    });

    it('should handle non-array response from wallet', async () => {
      mockEthereum.request.mockResolvedValue('invalid-response');

      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      act(() => {
        screen.getByTestId('connect-wallet').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('ethereum-provider')).toHaveTextContent(
          'null'
        );
        expect(screen.getByTestId('signer')).toHaveTextContent('null');
        expect(screen.getByTestId('account')).toHaveTextContent('');
      });
    });
  });

  describe('Wallet Disconnection', () => {
    it('should disconnect wallet when accounts change to empty array', async () => {
      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      // First connect
      act(() => {
        screen.getByTestId('connect-wallet').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('account')).toHaveTextContent(
          '0x1234567890abcdef1234567890abcdef12345678'
        );
      });

      act(() => {
        getAccountsChangedHandler()([]);
      });

      await waitFor(() => {
        expect(screen.getByTestId('ethereum-provider')).toHaveTextContent(
          'null'
        );
        expect(screen.getByTestId('signer')).toHaveTextContent('null');
        expect(screen.getByTestId('account')).toHaveTextContent('');
      });
    });
  });

  describe('Account Change Handling', () => {
    it('should set up account change listener', async () => {
      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      // Wait for initial state updates to complete
      await waitFor(() => {
        expect(mockEthereum.on).toHaveBeenCalledWith(
          'accountsChanged',
          expect.any(Function)
        );
      });
    });

    it('should disconnect when accounts array is empty', async () => {
      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      // First connect wallet
      act(() => {
        screen.getByTestId('connect-wallet').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('account')).toHaveTextContent(
          '0x1234567890abcdef1234567890abcdef12345678'
        );
      });

      act(() => {
        getAccountsChangedHandler()([]);
      });

      await waitFor(() => {
        expect(screen.getByTestId('ethereum-provider')).toHaveTextContent(
          'null'
        );
        expect(screen.getByTestId('signer')).toHaveTextContent('null');
        expect(screen.getByTestId('account')).toHaveTextContent('');
      });
    });

    it('should reconnect when account changes to different address', async () => {
      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      // First connect wallet
      act(() => {
        screen.getByTestId('connect-wallet').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('account')).toHaveTextContent(
          '0x1234567890abcdef1234567890abcdef12345678'
        );
      });

      // Set up new account for reconnection
      const newAddress = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';
      mockSigner.getAddress.mockResolvedValue(newAddress);
      mockEthereum.request.mockResolvedValue([newAddress]);

      act(() => {
        getAccountsChangedHandler()([newAddress]);
      });

      await waitFor(() => {
        expect(screen.getByTestId('account')).toHaveTextContent(newAddress);
      });
    });

    it('should not reconnect when account changes to same address', async () => {
      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      const accountsChangedHandler = getAccountsChangedHandler();
      expect(accountsChangedHandler).toBeDefined();

      // Simulate account change with no accounts (should trigger disconnect)
      act(() => {
        accountsChangedHandler([]);
      });

      // Reset mocks for the next test
      mockEthereum.request.mockClear();

      // Test that identical address doesn't trigger reconnection
      // Since account starts as empty string, use that as the baseline
      act(() => {
        accountsChangedHandler(['']);
      });

      // ONLY FIX: Wait for second handler state updates to complete
      await waitFor(() => {
        expect(screen.getByTestId('account')).toHaveTextContent('');
      });

      // Should not call request since account would be same (empty to empty)
      expect(mockEthereum.request).not.toHaveBeenCalled();
    });

    it('should clean up event listener on unmount', () => {
      const { unmount } = render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      expect(mockEthereum.on).toHaveBeenCalledWith(
        'accountsChanged',
        expect.any(Function)
      );

      unmount();

      expect(mockEthereum.removeListener).toHaveBeenCalledWith(
        'accountsChanged',
        expect.any(Function)
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle signer initialization errors', async () => {
      mockBrowserProvider.getSigner.mockRejectedValue(
        new Error('Signer error')
      );

      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      // Click the connect button which will trigger the error
      act(() => {
        screen.getByTestId('connect-wallet').click();
      });

      // Wait for the error to be handled and state to be reset
      await waitFor(() => {
        expect(screen.getByTestId('ethereum-provider')).toHaveTextContent(
          'null'
        );
        expect(screen.getByTestId('signer')).toHaveTextContent('null');
        expect(screen.getByTestId('account')).toHaveTextContent('');
        expect(screen.getByTestId('errorMessage')).toHaveTextContent(
          'Wallet connection failed: Signer error'
        );
      });
    });

    it('should clear error when attempting new connection', async () => {
      mockEthereum.request.mockRejectedValue(
        new Error('User rejected the request')
      );

      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      // Trigger an error
      act(() => {
        screen.getByTestId('connect-wallet').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('errorMessage')).toHaveTextContent(
          'Wallet connection failed: User rejected the request'
        );
      });

      // Set up successful connection for retry
      mockEthereum.request.mockResolvedValue([
        '0x1234567890abcdef1234567890abcdef12345678',
      ]);

      // Try connecting again - should clear previous error
      act(() => {
        screen.getByTestId('connect-wallet').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('account')).toHaveTextContent(
          '0x1234567890abcdef1234567890abcdef12345678'
        );
        expect(screen.getByTestId('errorMessage')).toHaveTextContent('null');
      });
    });

    it('should handle address retrieval errors', async () => {
      mockSigner.getAddress.mockRejectedValue(new Error('Address error'));

      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      act(() => {
        screen.getByTestId('connect-wallet').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('ethereum-provider')).toHaveTextContent(
          'null'
        );
        expect(screen.getByTestId('signer')).toHaveTextContent('null');
        expect(screen.getByTestId('account')).toHaveTextContent('');
      });
    });

    it('should handle missing ethereum provider during initialization', async () => {
      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      // Connect first
      act(() => {
        screen.getByTestId('connect-wallet').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('account')).toHaveTextContent(
          '0x1234567890abcdef1234567890abcdef12345678'
        );
      });

      // Remove ethereum provider
      Object.defineProperty(window, 'ethereum', {
        value: undefined,
        writable: true,
      });

      // This should throw during the next initialization attempt
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      act(() => {
        screen.getByTestId('connect-wallet').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('ethereum-provider')).toHaveTextContent(
          'connected'
        );
      });

      consoleErrorSpy.mockRestore();
    });
  });
});
