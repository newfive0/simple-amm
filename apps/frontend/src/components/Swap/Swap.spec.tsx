import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ethers } from 'ethers';
import { Swap } from './Swap';
import {
  createDeferredTransactionPromise,
  createMockContracts,
  mockContractAddresses,
} from '../../test-mocks';

const mockSetErrorMessage = vi.fn();
vi.mock('../../contexts/ErrorMessageContext', () => ({
  useErrorMessage: () => ({
    setErrorMessage: mockSetErrorMessage,
  }),
}));

// Create mock contracts
const { mockTokenContract, mockAmmContract, tokenContract, ammContract } =
  createMockContracts();

const mockOnSwapComplete = vi.fn();

const defaultProps = {
  ammContract,
  tokenContract,
  poolEthReserve: BigInt(10e18), // 10 ETH in wei
  poolTokenReserve: BigInt(20e18), // 20 tokens in wei
  onSwapComplete: mockOnSwapComplete,
};

describe('Swap Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSetErrorMessage.mockClear();
  });

  describe('Rendering', () => {
    it('should render swap component with default Token to ETH direction', () => {
      render(<Swap {...defaultProps} />);

      expect(screen.getByText('Swap')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'ETH' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'SIMP' })).toBeInTheDocument();
      expect(screen.getByPlaceholderText('SIMP → ETH')).toBeInTheDocument();
      expect(screen.getByText('Swap SIMP for ETH')).toBeInTheDocument();
    });

    it('should render ETH to Token direction when SIMP tab selected', () => {
      render(<Swap {...defaultProps} />);

      const simpTab = screen.getByRole('button', { name: 'SIMP' });
      fireEvent.click(simpTab);

      expect(screen.getByPlaceholderText('ETH → SIMP')).toBeInTheDocument();
      expect(screen.getByText('Swap ETH for SIMP')).toBeInTheDocument();
    });
  });

  describe('Swap Calculation', () => {
    it('should calculate Token to ETH swap correctly', () => {
      render(<Swap {...defaultProps} />);

      const input = screen.getByPlaceholderText('SIMP → ETH');
      fireEvent.change(input, { target: { value: '5' } });

      // With pool reserves ETH: 10, Token: 20 and 0.3% fee
      // AMM formula: (10 * (5 * 997 / 1000)) / (20 + (5 * 997 / 1000)) ≈ 1.995197
      expect(screen.getByText(/≈ 1\.995197 ETH/)).toBeInTheDocument();
    });

    it('should calculate ETH to Token swap correctly', () => {
      render(<Swap {...defaultProps} />);

      const simpTab = screen.getByRole('button', { name: 'SIMP' });
      fireEvent.click(simpTab);

      const input = screen.getByPlaceholderText('ETH → SIMP');
      fireEvent.change(input, { target: { value: '2' } });

      // With pool reserves ETH: 10, Token: 20 and 0.3% fee
      // AMM formula: (20 * (2 * 997 / 1000)) / (10 + (2 * 997 / 1000)) ≈ 3.324996
      expect(screen.getByText(/≈ 3\.324996 SIMP/)).toBeInTheDocument();
    });

    it('should handle zero pool reserves', () => {
      render(
        <Swap {...defaultProps} poolEthReserve={0n} poolTokenReserve={0n} />
      );

      const input = screen.getByPlaceholderText('SIMP → ETH');
      fireEvent.change(input, { target: { value: '1' } });

      expect(screen.getByText('≈ 0 ETH')).toBeInTheDocument();
    });

    it('should handle invalid input amounts', () => {
      render(<Swap {...defaultProps} />);

      const input = screen.getByPlaceholderText('SIMP → ETH');
      fireEvent.change(input, { target: { value: 'invalid' } });

      expect(screen.getByText('1 SIMP ≈ 0.500000 ETH')).toBeInTheDocument();
    });
  });

  describe('Token to ETH Swap', () => {
    it('should execute Token to ETH swap successfully', async () => {
      const { promise, resolve } = createDeferredTransactionPromise();
      mockTokenContract.approve.mockResolvedValue(promise);
      mockAmmContract.swap.mockResolvedValue(promise);

      render(<Swap {...defaultProps} />);

      const input = screen.getByPlaceholderText('SIMP → ETH');
      fireEvent.change(input, { target: { value: '1.5' } });

      const swapButton = screen.getByText('Swap SIMP for ETH');
      fireEvent.click(swapButton);

      expect(swapButton).toHaveTextContent('Waiting...');
      expect(swapButton).toBeDisabled();

      resolve();
      await waitFor(() => {
        expect(mockTokenContract.approve).toHaveBeenCalled();
        expect(mockAmmContract.swap).toHaveBeenCalledWith(
          mockContractAddresses.tokenAddress,
          BigInt(1.5e18), // 1.5 SIMP in wei
          BigInt(0.995e18) // 0.5% slippage protection applied
        );
      });

      await waitFor(() => {
        expect(mockOnSwapComplete).toHaveBeenCalled();
        expect(swapButton).toHaveTextContent('Swap SIMP for ETH');
        expect(input).toHaveDisplayValue('');
      });
    });

    it('should handle Token to ETH swap failure', async () => {
      mockTokenContract.approve.mockRejectedValue(
        new Error('Transaction failed')
      );

      render(<Swap {...defaultProps} />);

      const input = screen.getByPlaceholderText('SIMP → ETH');
      fireEvent.change(input, { target: { value: '1' } });

      const swapButton = screen.getByText('Swap SIMP for ETH');
      fireEvent.click(swapButton);

      await waitFor(() => {
        expect(mockSetErrorMessage).toHaveBeenCalledWith(
          'Swap failed: Transaction failed'
        );
        expect(swapButton).toHaveTextContent('Swap SIMP for ETH');
        expect(swapButton).not.toBeDisabled();
      });
    });
  });

  describe('ETH to Token Swap', () => {
    it('should execute ETH to Token swap successfully', async () => {
      const { promise, resolve } = createDeferredTransactionPromise();
      mockAmmContract.swap.mockResolvedValue(promise);

      render(<Swap {...defaultProps} />);

      // Switch to ETH to Token
      const simpTab = screen.getByRole('button', { name: 'SIMP' });
      fireEvent.click(simpTab);

      const input = screen.getByPlaceholderText('ETH → SIMP');
      fireEvent.change(input, { target: { value: '1.5' } });

      const swapButton = screen.getByText('Swap ETH for SIMP');
      fireEvent.click(swapButton);

      expect(swapButton).toHaveTextContent('Waiting...');
      expect(swapButton).toBeDisabled();

      resolve();
      await waitFor(() => {
        expect(mockAmmContract.swap).toHaveBeenCalledWith(
          ethers.ZeroAddress,
          0,
          BigInt('995000000000000000'), // 0.5% slippage protection applied
          { value: BigInt(1.5e18) } // 1.5 ETH in wei
        );
      });

      await waitFor(() => {
        expect(mockOnSwapComplete).toHaveBeenCalled();
        expect(swapButton).toHaveTextContent('Swap ETH for SIMP');
        expect(input).toHaveDisplayValue('');
      });
    });

    it('should handle ETH to Token swap failure', async () => {
      mockAmmContract.swap.mockRejectedValue(new Error('Transaction failed'));

      render(<Swap {...defaultProps} />);

      // Switch to ETH to Token
      const simpTab = screen.getByRole('button', { name: 'SIMP' });
      fireEvent.click(simpTab);

      const input = screen.getByPlaceholderText('ETH → SIMP');
      fireEvent.change(input, { target: { value: '1' } });

      const swapButton = screen.getByText('Swap ETH for SIMP');
      fireEvent.click(swapButton);

      await waitFor(() => {
        expect(mockSetErrorMessage).toHaveBeenCalledWith(
          'Swap failed: Transaction failed'
        );
        expect(swapButton).toHaveTextContent('Swap ETH for SIMP');
        expect(swapButton).not.toBeDisabled();
      });
    });
  });

  describe('Form Reset', () => {
    it('should reset form after successful swap', async () => {
      const { promise, resolve } = createDeferredTransactionPromise();
      mockTokenContract.approve.mockResolvedValue(promise);
      mockAmmContract.swap.mockResolvedValue(promise);

      render(<Swap {...defaultProps} />);

      const input = screen.getByPlaceholderText('SIMP → ETH');
      fireEvent.change(input, { target: { value: '1.5' } });

      expect(input).toHaveDisplayValue('1.5');

      const swapButton = screen.getByText('Swap SIMP for ETH');
      fireEvent.click(swapButton);

      resolve();
      await waitFor(() => {
        expect(input).toHaveDisplayValue('');
      });
    });

    it('should not reset form after failed swap', async () => {
      mockTokenContract.approve.mockRejectedValue(new Error('Failed'));

      render(<Swap {...defaultProps} />);

      const input = screen.getByPlaceholderText('SIMP → ETH');
      fireEvent.change(input, { target: { value: '1.5' } });

      const swapButton = screen.getByText('Swap SIMP for ETH');
      fireEvent.click(swapButton);

      await waitFor(() => {
        expect(mockSetErrorMessage).toHaveBeenCalled();
        expect(input).toHaveDisplayValue('1.5'); // Should retain value
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle unknown error types', async () => {
      mockTokenContract.approve.mockRejectedValue('string error');

      render(<Swap {...defaultProps} />);

      const input = screen.getByPlaceholderText('SIMP → ETH');
      fireEvent.change(input, { target: { value: '1' } });

      const swapButton = screen.getByText('Swap SIMP for ETH');
      fireEvent.click(swapButton);

      await waitFor(() => {
        expect(mockSetErrorMessage).toHaveBeenCalledWith(
          'Swap failed: "string error"'
        );
      });
    });

    it('should update expected output when switching directions', () => {
      render(<Swap {...defaultProps} />);

      // Start with Token to ETH (default)
      const tokenInput = screen.getByPlaceholderText('SIMP → ETH');
      fireEvent.change(tokenInput, { target: { value: '5' } });
      expect(screen.getByText(/≈ 1\.995197 ETH/)).toBeInTheDocument();

      // Switch to ETH to Token
      const simpTab = screen.getByRole('button', { name: 'SIMP' });
      fireEvent.click(simpTab);

      const ethInput = screen.getByPlaceholderText('ETH → SIMP');
      fireEvent.change(ethInput, { target: { value: '1' } });
      expect(screen.getByText(/≈ 1\.813222 SIMP/)).toBeInTheDocument();
    });
  });
});
