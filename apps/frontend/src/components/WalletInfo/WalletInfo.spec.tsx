import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { WalletInfo } from './WalletInfo';

const defaultProps = {
  account: '0x1234567890abcdef1234567890abcdef12345678',
  ethBalance: 5.123456789,
  tokenBalance: 1000.987654321,
  tokenSymbol: 'SIMP',
  isCheckingConnection: false,
};

describe('WalletInfo', () => {
  describe('Rendering', () => {
    it('should render wallet info when connected', () => {
      render(<WalletInfo {...defaultProps} />);
      
      expect(screen.getByText('Account:', { exact: false })).toBeInTheDocument();
      expect(screen.getByText(defaultProps.account)).toBeInTheDocument();
      expect(screen.getByText('Balance:', { exact: false })).toBeInTheDocument();
    });

    it('should display formatted balances with correct precision', () => {
      render(<WalletInfo {...defaultProps} />);
      
      // Should show 4 decimal places for both token and ETH balances
      expect(screen.getByText(/1000\.9877 SIMP/)).toBeInTheDocument();
      expect(screen.getByText(/5\.1235 ETH/)).toBeInTheDocument();
    });

    it('should show checking connection message when isCheckingConnection is true', () => {
      render(<WalletInfo {...defaultProps} isCheckingConnection={true} />);
      
      expect(screen.getByText('Checking wallet connection...')).toBeInTheDocument();
      expect(screen.queryByText('Account:')).not.toBeInTheDocument();
      expect(screen.queryByText('Balance:')).not.toBeInTheDocument();
    });
  });

  describe('Account Display', () => {
    it('should display full account address', () => {
      const longAccount = '0x1234567890abcdef1234567890abcdef12345678';
      render(<WalletInfo {...defaultProps} account={longAccount} />);
      
      expect(screen.getByText(longAccount)).toBeInTheDocument();
    });
  });

  describe('Token Symbol', () => {
    it('should display custom token symbol', () => {
      render(<WalletInfo {...defaultProps} tokenSymbol="CUSTOM" />);
      
      expect(screen.getByText(/CUSTOM/)).toBeInTheDocument();
      expect(screen.queryByText(/SIMP/)).not.toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('should not show account info when checking connection', () => {
      render(<WalletInfo {...defaultProps} isCheckingConnection={true} />);
      
      expect(screen.queryByText(defaultProps.account)).not.toBeInTheDocument();
      expect(screen.queryByText(/Balance:/)).not.toBeInTheDocument();
    });

    it('should only show loading message when checking connection', () => {
      render(<WalletInfo {...defaultProps} isCheckingConnection={true} />);
      
      const loadingMessage = screen.getByText('Checking wallet connection...');
      expect(loadingMessage).toBeInTheDocument();
      
      // Should not show any other content
      expect(screen.queryByText('Account:')).not.toBeInTheDocument();
    });
  });

  describe('Disconnected State', () => {
    it('should show "not connected" for both account and balance when account is empty', () => {
      render(<WalletInfo {...defaultProps} account="" />);
      
      // Should show labels
      expect(screen.getByText('Account:', { exact: false })).toBeInTheDocument();
      expect(screen.getByText('Balance:', { exact: false })).toBeInTheDocument();
      
      // Should show "Not connected" and "N/A" for account and balance respectively
      expect(screen.getByText('Not connected')).toBeInTheDocument();
      expect(screen.getByText('N/A')).toBeInTheDocument();
      
      // Should not show actual account or balance values
      expect(screen.queryByText(defaultProps.account)).not.toBeInTheDocument();
      expect(screen.queryByText(/SIMP/)).not.toBeInTheDocument();
      expect(screen.queryByText(/ETH/)).not.toBeInTheDocument();
      expect(screen.queryByText(/1000\.9877/)).not.toBeInTheDocument();
      expect(screen.queryByText(/5\.1235/)).not.toBeInTheDocument();
    });
  });
});