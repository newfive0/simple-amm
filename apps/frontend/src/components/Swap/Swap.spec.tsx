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
      expect(
        screen.getByRole('button', { name: 'Switch Direction' })
      ).toBeInTheDocument();
      expect(screen.getByPlaceholderText('SIMP → ETH')).toBeInTheDocument();
      expect(screen.getByText('Swap SIMP for ETH')).toBeInTheDocument();
    });

    it('should render ETH to Token direction when switch direction button clicked', () => {
      render(<Swap {...defaultProps} />);

      const switchButton = screen.getByRole('button', {
        name: 'Switch Direction',
      });
      fireEvent.click(switchButton);

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
      // AMM formula: (10 * (5 * 997 / 1000)) / (20 + (5 * 997 / 1000)) ≈ 1.9952
      expect(screen.getByText(/≈ 1\.9952 ETH/)).toBeInTheDocument();
    });

    it('should calculate ETH to Token swap correctly', () => {
      render(<Swap {...defaultProps} />);

      const switchButton = screen.getByRole('button', {
        name: 'Switch Direction',
      });
      fireEvent.click(switchButton);

      const input = screen.getByPlaceholderText('ETH → SIMP');
      fireEvent.change(input, { target: { value: '2' } });

      // With pool reserves ETH: 10, Token: 20 and 0.3% fee
      // AMM formula: (20 * (2 * 997 / 1000)) / (10 + (2 * 997 / 1000)) ≈ 3.3250
      expect(screen.getByText(/≈ 3\.3250 SIMP/)).toBeInTheDocument();
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

      expect(screen.getByText('1 SIMP ≈ 0.5000 ETH')).toBeInTheDocument();
    });
  });

  describe('Token to ETH Swap', () => {
    it('should execute Token to ETH swap successfully', async () => {
      const { promise, resolve } = createDeferredTransactionPromise();
      mockTokenContract.approve.mockResolvedValue(promise);
      mockAmmContract.swap.mockResolvedValue(promise);
      mockAmmContract.getSwapOutput.mockResolvedValue(BigInt(1e18));

      render(<Swap {...defaultProps} />);

      const input = screen.getByPlaceholderText('SIMP → ETH');
      fireEvent.change(input, { target: { value: '1.5' } });

      const swapButton = screen.getByText('Swap SIMP for ETH');
      fireEvent.click(swapButton);

      // Wait for confirmation dialog to appear
      await waitFor(() => {
        expect(screen.getByText('Swap Confirmation')).toBeInTheDocument();
      });

      // Click the proceed button in the confirmation dialog
      const proceedButton = screen.getByText('Proceed');
      fireEvent.click(proceedButton);

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
      mockAmmContract.getSwapOutput.mockResolvedValue(BigInt(1e18));

      render(<Swap {...defaultProps} />);

      const input = screen.getByPlaceholderText('SIMP → ETH');
      fireEvent.change(input, { target: { value: '1' } });

      const swapButton = screen.getByText('Swap SIMP for ETH');
      fireEvent.click(swapButton);

      // Wait for confirmation dialog to appear
      await waitFor(() => {
        expect(screen.getByText('Swap Confirmation')).toBeInTheDocument();
      });

      // Click the proceed button in the confirmation dialog
      const proceedButton = screen.getByText('Proceed');
      fireEvent.click(proceedButton);

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
      mockAmmContract.getSwapOutput.mockResolvedValue(BigInt(2e18));

      render(<Swap {...defaultProps} />);

      // Switch to ETH to Token
      const switchButton = screen.getByRole('button', {
        name: 'Switch Direction',
      });
      fireEvent.click(switchButton);

      const input = screen.getByPlaceholderText('ETH → SIMP');
      fireEvent.change(input, { target: { value: '1.5' } });

      const swapButton = screen.getByText('Swap ETH for SIMP');
      fireEvent.click(swapButton);

      // Wait for confirmation dialog to appear
      await waitFor(() => {
        expect(screen.getByText('Swap Confirmation')).toBeInTheDocument();
      });

      // Click the proceed button in the confirmation dialog
      const proceedButton = screen.getByText('Proceed');
      fireEvent.click(proceedButton);

      expect(swapButton).toHaveTextContent('Waiting...');
      expect(swapButton).toBeDisabled();

      resolve();
      await waitFor(() => {
        expect(mockAmmContract.swap).toHaveBeenCalledWith(
          ethers.ZeroAddress,
          0,
          BigInt('1990000000000000000'), // 0.5% slippage protection applied (2 ETH * 0.995)
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
      mockAmmContract.getSwapOutput.mockResolvedValue(BigInt(1e18));

      render(<Swap {...defaultProps} />);

      // Switch to ETH to Token
      const switchButton = screen.getByRole('button', {
        name: 'Switch Direction',
      });
      fireEvent.click(switchButton);

      const input = screen.getByPlaceholderText('ETH → SIMP');
      fireEvent.change(input, { target: { value: '1' } });

      const swapButton = screen.getByText('Swap ETH for SIMP');
      fireEvent.click(swapButton);

      // Wait for confirmation dialog to appear
      await waitFor(() => {
        expect(screen.getByText('Swap Confirmation')).toBeInTheDocument();
      });

      // Click the proceed button in the confirmation dialog
      const proceedButton = screen.getByText('Proceed');
      fireEvent.click(proceedButton);

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
      mockAmmContract.getSwapOutput.mockResolvedValue(BigInt(1e18));

      render(<Swap {...defaultProps} />);

      const input = screen.getByPlaceholderText('SIMP → ETH');
      fireEvent.change(input, { target: { value: '1.5' } });

      expect(input).toHaveDisplayValue('1.5');

      const swapButton = screen.getByText('Swap SIMP for ETH');
      fireEvent.click(swapButton);

      // Wait for confirmation dialog to appear and click proceed
      await waitFor(() => {
        expect(screen.getByText('Swap Confirmation')).toBeInTheDocument();
      });
      const proceedButton = screen.getByText('Proceed');
      fireEvent.click(proceedButton);

      resolve();
      await waitFor(() => {
        expect(input).toHaveDisplayValue('');
      });
    });

    it('should not reset form after failed swap', async () => {
      mockTokenContract.approve.mockRejectedValue(new Error('Failed'));
      mockAmmContract.getSwapOutput.mockResolvedValue(BigInt(1e18));

      render(<Swap {...defaultProps} />);

      const input = screen.getByPlaceholderText('SIMP → ETH');
      fireEvent.change(input, { target: { value: '1.5' } });

      const swapButton = screen.getByText('Swap SIMP for ETH');
      fireEvent.click(swapButton);

      // Wait for confirmation dialog to appear and click proceed
      await waitFor(() => {
        expect(screen.getByText('Swap Confirmation')).toBeInTheDocument();
      });
      const proceedButton = screen.getByText('Proceed');
      fireEvent.click(proceedButton);

      await waitFor(() => {
        expect(mockSetErrorMessage).toHaveBeenCalled();
        expect(input).toHaveDisplayValue('1.5'); // Should retain value
      });
    });
  });

  describe('Confirmation Dialog Integration', () => {
    it('should show confirmation dialog before executing swap', async () => {
      mockAmmContract.getSwapOutput.mockResolvedValue(BigInt(1e18));

      render(<Swap {...defaultProps} />);

      const input = screen.getByPlaceholderText('SIMP → ETH');
      fireEvent.change(input, { target: { value: '1.0' } });

      const swapButton = screen.getByText('Swap SIMP for ETH');
      fireEvent.click(swapButton);

      // Confirmation dialog should appear
      await waitFor(() => {
        expect(screen.getByText('Swap Confirmation')).toBeInTheDocument();
      });

      // Swap should not execute until confirmed
      expect(mockAmmContract.swap).not.toHaveBeenCalled();
    });

    it('should not execute swap when confirmation is cancelled', async () => {
      mockAmmContract.getSwapOutput.mockResolvedValue(BigInt(1e18));

      render(<Swap {...defaultProps} />);

      const input = screen.getByPlaceholderText('SIMP → ETH');
      fireEvent.change(input, { target: { value: '1.0' } });

      const swapButton = screen.getByText('Swap SIMP for ETH');
      fireEvent.click(swapButton);

      await waitFor(() => {
        expect(screen.getByText('Swap Confirmation')).toBeInTheDocument();
      });

      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByText('Swap Confirmation')).not.toBeInTheDocument();
      });

      // Swap should not have been called
      expect(mockAmmContract.swap).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle unknown error types', async () => {
      mockTokenContract.approve.mockRejectedValue('string error');
      mockAmmContract.getSwapOutput.mockResolvedValue(BigInt(1e18));

      render(<Swap {...defaultProps} />);

      const input = screen.getByPlaceholderText('SIMP → ETH');
      fireEvent.change(input, { target: { value: '1' } });

      const swapButton = screen.getByText('Swap SIMP for ETH');
      fireEvent.click(swapButton);

      // Wait for confirmation dialog to appear and click proceed
      await waitFor(() => {
        expect(screen.getByText('Swap Confirmation')).toBeInTheDocument();
      });
      const proceedButton = screen.getByText('Proceed');
      fireEvent.click(proceedButton);

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
      expect(screen.getByText(/≈ 1\.9952 ETH/)).toBeInTheDocument();

      // Switch to ETH to Token
      const switchButton = screen.getByRole('button', {
        name: 'Switch Direction',
      });
      fireEvent.click(switchButton);

      const ethInput = screen.getByPlaceholderText('ETH → SIMP');
      fireEvent.change(ethInput, { target: { value: '1' } });
      expect(screen.getByText(/≈ 1\.8132 SIMP/)).toBeInTheDocument();
    });
  });
});
