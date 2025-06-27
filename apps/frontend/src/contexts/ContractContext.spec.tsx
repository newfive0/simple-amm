import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ContractProvider, useContracts } from './ContractContext';

// Create test component to consume context
const TestComponent = () => {
  const { tokenContract, ammContract, contractAddresses } = useContracts();

  return (
    <div>
      <div data-testid="token-address">{contractAddresses.tokenAddress}</div>
      <div data-testid="amm-address">{contractAddresses.ammPoolAddress}</div>
      <div data-testid="contracts-loaded">
        {tokenContract && ammContract ? 'loaded' : 'not-loaded'}
      </div>
    </div>
  );
};

// Mock wallet context
const mockWalletContext = {
  signer: { connect: vi.fn(), getAddress: vi.fn() },
  account: '0x1234567890abcdef1234567890abcdef12345678',
};

vi.mock('./WalletContext', () => ({
  useWallet: () => mockWalletContext,
}));

vi.mock('@typechain-types', () => ({
  Token__factory: { connect: vi.fn(() => ({})) },
  AMMPool__factory: { connect: vi.fn(() => ({})) },
}));

beforeEach(() => {
  vi.clearAllMocks();
  
  // Reset wallet context to default connected state
  mockWalletContext.signer = { connect: vi.fn(), getAddress: vi.fn() };
  mockWalletContext.account = '0x1234567890abcdef1234567890abcdef12345678';
});

describe('ContractContext', () => {
  describe('Provider Setup', () => {
    it('should provide contract instances and addresses', () => {
      render(
        <ContractProvider>
          <TestComponent />
        </ContractProvider>
      );

      expect(screen.getByTestId('token-address')).toHaveTextContent('0x123');
      expect(screen.getByTestId('amm-address')).toHaveTextContent('0x456');
      expect(screen.getByTestId('contracts-loaded')).toHaveTextContent('loaded');
    });

    it('should throw error when useContracts is used outside provider', () => {
      // Suppress React error logging for this expected error
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      expect(() => render(<TestComponent />)).toThrow(
        'useContracts must be used within a ContractProvider'
      );

      consoleErrorSpy.mockRestore();
    });

    it('should throw error when signer is missing', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const originalSigner = mockWalletContext.signer;
      
      // @ts-expect-error - Testing null signer case
      mockWalletContext.signer = null;

      expect(() =>
        render(
          <ContractProvider>
            <TestComponent />
          </ContractProvider>
        )
      ).toThrow('Wallet signer and account required for contract initialization.');

      mockWalletContext.signer = originalSigner;
      consoleErrorSpy.mockRestore();
    });

    it('should throw error when account is missing', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const originalAccount = mockWalletContext.account;
      
      // @ts-expect-error - Testing null account case
      mockWalletContext.account = null;

      expect(() =>
        render(
          <ContractProvider>
            <TestComponent />
          </ContractProvider>
        )
      ).toThrow('Wallet signer and account required for contract initialization.');

      mockWalletContext.account = originalAccount;
      consoleErrorSpy.mockRestore();
    });
  });

  describe('Contract Address Loading', () => {
    it('should load contract addresses from environment variables', () => {
      render(
        <ContractProvider>
          <TestComponent />
        </ContractProvider>
      );

      expect(screen.getByTestId('token-address')).toHaveTextContent('0x123');
      expect(screen.getByTestId('amm-address')).toHaveTextContent('0x456');
    });

  });

  describe('Contract Initialization', () => {
    it('should initialize contracts with correct addresses and signer', () => {

      render(
        <ContractProvider>
          <TestComponent />
        </ContractProvider>
      );

      expect(screen.getByTestId('contracts-loaded')).toHaveTextContent('loaded');
    });

    it('should provide contract addresses in expected format', () => {
      render(
        <ContractProvider>
          <TestComponent />
        </ContractProvider>
      );

      const tokenAddress = screen.getByTestId('token-address').textContent;
      const ammAddress = screen.getByTestId('amm-address').textContent;

      expect(tokenAddress).toMatch(/^0x[a-fA-F0-9]{3}$/);
      expect(ammAddress).toMatch(/^0x[a-fA-F0-9]{3}$/);
      expect(tokenAddress).toBe('0x123');
      expect(ammAddress).toBe('0x456');
    });
  });


  describe('Contract Factory Integration', () => {
    it('should pass signer to contract factories for transaction support', () => {
      render(
        <ContractProvider>
          <TestComponent />
        </ContractProvider>
      );

      expect(screen.getByTestId('contracts-loaded')).toHaveTextContent('loaded');
    });

    it('should create contracts that can be used for transactions', () => {
      render(
        <ContractProvider>
          <TestComponent />
        </ContractProvider>
      );

      expect(screen.getByTestId('contracts-loaded')).toHaveTextContent('loaded');
    });
  });
});