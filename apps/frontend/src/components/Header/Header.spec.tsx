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
      connectWallet: vi.fn()
    };
    
    vi.mocked(useWallet).mockReturnValue(mockWalletContext);
    
    render(<Header />);
    
    expect(screen.getByText('Very Simple AMM')).toBeInTheDocument();
    expect(screen.queryByText('Connect Wallet')).not.toBeInTheDocument();
  });
});