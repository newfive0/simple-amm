import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import { Header } from './Header';
import type { WalletContextType } from '../../contexts/WalletContext';

// Mock the wallet context
vi.mock('../../contexts', () => ({
  useWallet: vi.fn(),
}));

// Mock ConnectWallet component
vi.mock('../ConnectWallet', () => ({
  ConnectWallet: () => <button>Connect Wallet</button>,
}));

const { useWallet } = await import('../../contexts');

describe('Header Component', () => {
  it('should render title and connect button when not connected', () => {
    const mockWalletContext: WalletContextType = {
      account: '',
      ethereumProvider: null,
      signer: null,
      isCheckingConnection: false,
      error: null,
      connectWallet: vi.fn()
    };
    
    vi.mocked(useWallet).mockReturnValue(mockWalletContext);
    
    render(<Header />);
    
    expect(screen.getByText('Very Simple AMM')).toBeInTheDocument();
    expect(screen.getByText('Connect Wallet')).toBeInTheDocument();
  });

  it('should render only title when connected', () => {
    const mockWalletContext: WalletContextType = {
      account: '0x123',
      ethereumProvider: null,
      signer: null,
      isCheckingConnection: false,
      error: null,
      connectWallet: vi.fn()
    };
    
    vi.mocked(useWallet).mockReturnValue(mockWalletContext);
    
    render(<Header />);
    
    expect(screen.getByText('Very Simple AMM')).toBeInTheDocument();
    expect(screen.queryByText('Connect Wallet')).not.toBeInTheDocument();
  });

  it('should display error message when error exists', () => {
    const mockWalletContext: WalletContextType = {
      account: '',
      ethereumProvider: null,
      signer: null,
      isCheckingConnection: false,
      error: 'User rejected the request',
      connectWallet: vi.fn()
    };
    
    vi.mocked(useWallet).mockReturnValue(mockWalletContext);
    
    render(<Header />);
    
    expect(screen.getByText('Very Simple AMM')).toBeInTheDocument();
    expect(screen.getByText('User rejected the request')).toBeInTheDocument();
  });

  it('should not display error section when error is null', () => {
    const mockWalletContext: WalletContextType = {
      account: '',
      ethereumProvider: null,
      signer: null,
      isCheckingConnection: false,
      error: null,
      connectWallet: vi.fn()
    };
    
    vi.mocked(useWallet).mockReturnValue(mockWalletContext);
    
    render(<Header />);
    
    expect(screen.getByText('Very Simple AMM')).toBeInTheDocument();
    expect(screen.queryByText('User rejected the request')).not.toBeInTheDocument();
  });
});