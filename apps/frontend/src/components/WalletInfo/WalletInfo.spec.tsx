import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { WalletInfo } from './WalletInfo';

const defaultProps = {
  account: '0x1234567890abcdef1234567890abcdef12345678',
};

describe('WalletInfo', () => {
  describe('Rendering', () => {
    it('should render wallet info when connected', () => {
      render(<WalletInfo {...defaultProps} />);

      expect(
        screen.getByText('Connected Account:', { exact: false })
      ).toBeInTheDocument();
      expect(screen.getByText(defaultProps.account)).toBeInTheDocument();
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
  });
});
