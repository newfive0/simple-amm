import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WalletInfo } from './WalletInfo';

// Mock environment variables
vi.mock('import.meta', () => ({
  env: {
    VITE_TOKEN_ADDRESS: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
  },
}));

const mockAddTokenToWallet = vi.fn();

const defaultProps = {
  account: '0x1234567890abcdef1234567890abcdef12345678',
  addTokenToWallet: mockAddTokenToWallet,
};

describe('WalletInfo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render wallet info when connected', () => {
      render(<WalletInfo {...defaultProps} />);

      expect(
        screen.getByText('Connected Account:', { exact: false })
      ).toBeInTheDocument();
      expect(screen.getByText(defaultProps.account)).toBeInTheDocument();
    });

    it('should render token address when available', () => {
      render(<WalletInfo {...defaultProps} />);

      expect(
        screen.getByText('SIMP Token Address:', { exact: false })
      ).toBeInTheDocument();
      // The mock environment shows a truncated address, so check for that
      expect(screen.getByText('0x123')).toBeInTheDocument();
    });

    it('should render add token link when connected', () => {
      render(<WalletInfo {...defaultProps} />);

      const addTokenLink = screen.getByRole('link', {
        name: /add simp to wallet/i,
      });
      expect(addTokenLink).toBeInTheDocument();
    });
  });

  describe('Account Display', () => {
    it('should display full account address', () => {
      const longAccount = '0x1234567890abcdef1234567890abcdef12345678';
      render(<WalletInfo {...defaultProps} account={longAccount} />);

      expect(screen.getByText(longAccount)).toBeInTheDocument();
    });
  });

  describe('Disconnected State', () => {
    it('should show "not connected" when account is empty', () => {
      render(<WalletInfo {...defaultProps} account="" />);

      // Should show label
      expect(
        screen.getByText('Connected Account:', { exact: false })
      ).toBeInTheDocument();

      // Should show "Not Connected"
      expect(screen.getByText('Not Connected')).toBeInTheDocument();

      // Should not show actual account value
      expect(screen.queryByText(defaultProps.account)).not.toBeInTheDocument();
    });

    it('should still show add token link when not connected', () => {
      render(<WalletInfo {...defaultProps} account="" />);

      const addTokenLink = screen.getByRole('link', {
        name: /add simp to wallet/i,
      });
      expect(addTokenLink).toBeInTheDocument();
    });
  });

  describe('Token Functionality', () => {
    it('should call addTokenToWallet when link is clicked', async () => {
      render(<WalletInfo {...defaultProps} />);

      const addTokenLink = screen.getByRole('link', {
        name: /add simp to wallet/i,
      });

      fireEvent.click(addTokenLink);

      expect(mockAddTokenToWallet).toHaveBeenCalledTimes(1);
    });
  });
});
