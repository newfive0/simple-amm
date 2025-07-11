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
    it('should render swap component with default ETH to Token direction', () => {
      render(<Swap {...defaultProps} />);

      expect(screen.getByText('Swap')).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Switch Direction' })
      ).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText('Amount of ETH to spend')
      ).toBeInTheDocument();
      expect(screen.getByText('Swap ETH for SIMP')).toBeInTheDocument();
    });

    it('should render Token to ETH direction when switch direction button clicked', () => {
      render(<Swap {...defaultProps} />);

      const switchButton = screen.getByRole('button', {
        name: 'Switch Direction',
      });
      fireEvent.click(switchButton);

      expect(
        screen.getByPlaceholderText('Amount of SIMP to spend')
      ).toBeInTheDocument();
      expect(screen.getByText('Swap SIMP for ETH')).toBeInTheDocument();
    });
  });

  describe('Swap Calculation', () => {
    it('should calculate ETH to Token swap correctly', () => {
      render(<Swap {...defaultProps} />);

      const input = screen.getByPlaceholderText('Amount of ETH to spend');
      fireEvent.change(input, { target: { value: '2' } });

      // With pool reserves ETH: 10, Token: 20 and 0.3% fee
      // Forward calculation: Spend 2 ETH, get ~3.3250 SIMP
      expect(screen.getByText(/≈ 3\.3250 SIMP/)).toBeInTheDocument();
    });

    it('should calculate Token to ETH swap correctly', () => {
      render(<Swap {...defaultProps} />);

      const switchButton = screen.getByRole('button', {
        name: 'Switch Direction',
      });
      fireEvent.click(switchButton);

      const input = screen.getByPlaceholderText('Amount of SIMP to spend');
      fireEvent.change(input, { target: { value: '5' } });

      // With pool reserves ETH: 10, Token: 20 and 0.3% fee
      // Forward calculation: Spend 5 SIMP, get ~1.9952 ETH
      expect(screen.getByText(/≈ 1\.9952 ETH/)).toBeInTheDocument();
    });

    it('should handle zero pool reserves', () => {
      render(
        <Swap {...defaultProps} poolEthReserve={0n} poolTokenReserve={0n} />
      );

      const input = screen.getByPlaceholderText('Amount of ETH to spend');
      fireEvent.change(input, { target: { value: '1' } });

      expect(screen.getByText('≈ 0 SIMP')).toBeInTheDocument();
    });

    it('should handle invalid input amounts', () => {
      render(<Swap {...defaultProps} />);

      const input = screen.getByPlaceholderText('Amount of ETH to spend');
      fireEvent.change(input, { target: { value: 'invalid' } });

      expect(screen.getByText('1 ETH ≈ 2.0000 SIMP')).toBeInTheDocument();
    });
  });

  describe('Token to ETH Swap', () => {
    it('should execute Token to ETH swap successfully', async () => {
      const { promise, resolve } = createDeferredTransactionPromise();
      mockTokenContract.approve.mockResolvedValue(promise);
      mockAmmContract.swap.mockResolvedValue(promise);
      mockAmmContract.getSwapOutput.mockResolvedValue(BigInt(1e18));

      render(<Swap {...defaultProps} />);

      // Switch to Token to ETH direction
      const switchButton = screen.getByRole('button', {
        name: 'Switch Direction',
      });
      fireEvent.click(switchButton);

      const input = screen.getByPlaceholderText('Amount of SIMP to spend');
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
          expect.any(BigInt), // Calculated input amount
          expect.any(BigInt) // Desired output with 0.5% slippage protection
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

      // Switch to Token to ETH direction
      const switchButton = screen.getByRole('button', {
        name: 'Switch Direction',
      });
      fireEvent.click(switchButton);

      const input = screen.getByPlaceholderText('Amount of SIMP to spend');
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

      const input = screen.getByPlaceholderText('Amount of ETH to spend');
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
          expect.any(BigInt), // Desired output with 0.5% slippage protection
          { value: expect.any(BigInt) } // Calculated input amount
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

      const input = screen.getByPlaceholderText('Amount of ETH to spend');
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

      // Switch to Token to ETH direction
      const switchButton = screen.getByRole('button', {
        name: 'Switch Direction',
      });
      fireEvent.click(switchButton);

      const input = screen.getByPlaceholderText('Amount of SIMP to spend');
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

      // Switch to Token to ETH direction
      const switchButton = screen.getByRole('button', {
        name: 'Switch Direction',
      });
      fireEvent.click(switchButton);

      const input = screen.getByPlaceholderText('Amount of SIMP to spend');
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

      // Switch to Token to ETH direction
      const switchButton = screen.getByRole('button', {
        name: 'Switch Direction',
      });
      fireEvent.click(switchButton);

      const input = screen.getByPlaceholderText('Amount of SIMP to spend');
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

      // Switch to Token to ETH direction
      const switchButton = screen.getByRole('button', {
        name: 'Switch Direction',
      });
      fireEvent.click(switchButton);

      const input = screen.getByPlaceholderText('Amount of SIMP to spend');
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

    it('should display user-friendly confirmation dialog text', async () => {
      mockAmmContract.getSwapOutput.mockResolvedValue(BigInt(1e18));

      render(<Swap {...defaultProps} />);

      // Component defaults to ETH to Token direction
      const input = screen.getByPlaceholderText('Amount of ETH to spend');
      fireEvent.change(input, { target: { value: '1.0' } });

      const swapButton = screen.getByText('Swap ETH for SIMP');
      fireEvent.click(swapButton);

      await waitFor(() => {
        expect(screen.getByText('Swap Confirmation')).toBeInTheDocument();
      });

      // Check for user-friendly text instead of technical terms
      expect(screen.getByText(/You'll pay:/)).toBeInTheDocument();
      expect(screen.getByText(/You'll receive:/)).toBeInTheDocument();
      expect(screen.queryByText(/Required Input:/)).not.toBeInTheDocument();
      expect(screen.queryByText(/Expected Output:/)).not.toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle unknown error types', async () => {
      mockTokenContract.approve.mockRejectedValue('string error');
      mockAmmContract.getSwapOutput.mockResolvedValue(BigInt(1e18));

      render(<Swap {...defaultProps} />);

      // Switch to Token to ETH direction
      const switchButton = screen.getByRole('button', {
        name: 'Switch Direction',
      });
      fireEvent.click(switchButton);

      const input = screen.getByPlaceholderText('Amount of SIMP to spend');
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

      // Start with ETH to Token (default)
      const ethInput = screen.getByPlaceholderText('Amount of ETH to spend');
      fireEvent.change(ethInput, { target: { value: '2' } });
      expect(screen.getByText(/≈ 3\.3250 SIMP/)).toBeInTheDocument();

      // Switch to Token to ETH
      const switchButton = screen.getByRole('button', {
        name: 'Switch Direction',
      });
      fireEvent.click(switchButton);

      const tokenInput = screen.getByPlaceholderText('Amount of SIMP to spend');
      fireEvent.change(tokenInput, { target: { value: '5' } });
      expect(screen.getByText(/≈ 1\.9952 ETH/)).toBeInTheDocument();
    });
  });
});
