import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import { Header } from './Header';
import type { WalletContextType } from '../../contexts/WalletContext';
import type { ErrorMessageContextType } from '../../contexts/ErrorMessageContext';

// Mock the contexts
vi.mock('../../contexts', () => ({
  useWallet: vi.fn(),
  useErrorMessage: vi.fn(),
}));

// Mock ConnectWallet component
vi.mock('../ConnectWallet', () => ({
  ConnectWallet: () => <button>Connect Wallet</button>,
}));

const { useWallet, useErrorMessage } = await import('../../contexts');

// Helper functions to create mock contexts
const createMockWalletContext = (account = ''): WalletContextType => ({
  account,
  ethereumProvider: null,
  signer: null,
  connectWallet: vi.fn(),
});

const createMockErrorContext = (
  errorMessage = ''
): ErrorMessageContextType => ({
  errorMessage,
  setErrorMessage: vi.fn(),
});

const renderHeaderWithMocks = (account = '', errorMessage = '') => {
  vi.mocked(useWallet).mockReturnValue(createMockWalletContext(account));
  vi.mocked(useErrorMessage).mockReturnValue(
    createMockErrorContext(errorMessage)
  );
  return render(<Header />);
};

describe('Header Component', () => {
  it('should render title and connect button when not connected', () => {
    renderHeaderWithMocks();

    expect(screen.getByText('Very Simple AMM')).toBeInTheDocument();
    expect(screen.getByText('Connect Wallet')).toBeInTheDocument();
  });

  it('should render only title when connected', () => {
    renderHeaderWithMocks('0x123');

    expect(screen.getByText('Very Simple AMM')).toBeInTheDocument();
    expect(screen.queryByText('Connect Wallet')).not.toBeInTheDocument();
  });

  it('should display error message when error exists', () => {
    renderHeaderWithMocks('', 'User rejected the request');

    expect(screen.getByText('Very Simple AMM')).toBeInTheDocument();
    expect(screen.getByText('User rejected the request')).toBeInTheDocument();
    expect(screen.getByTestId('error-message')).toBeInTheDocument();
  });

  it('should not display error section when error is empty', () => {
    renderHeaderWithMocks();

    expect(screen.getByText('Very Simple AMM')).toBeInTheDocument();
    expect(
      screen.queryByText('User rejected the request')
    ).not.toBeInTheDocument();
  });

  it('should not display connect button when there is an error message', () => {
    renderHeaderWithMocks(
      '',
      'Ethereum wallet required. Please install a Web3 wallet extension.'
    );

    expect(screen.getByText('Very Simple AMM')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Ethereum wallet required. Please install a Web3 wallet extension.'
      )
    ).toBeInTheDocument();
    expect(screen.queryByText('Connect Wallet')).not.toBeInTheDocument();
  });
});
