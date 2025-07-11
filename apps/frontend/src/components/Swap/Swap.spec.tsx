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
      expect(screen.getByPlaceholderText('Sell ETH')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Buy SIMP')).toBeInTheDocument();
      expect(screen.getByText('Swap ETH → SIMP')).toBeInTheDocument();
    });

    it('should render Token to ETH direction when switch direction button clicked', () => {
      render(<Swap {...defaultProps} />);

      const switchButton = screen.getByRole('button', {
        name: 'Switch Direction',
      });
      fireEvent.click(switchButton);

      expect(screen.getByPlaceholderText('Buy ETH')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Sell SIMP')).toBeInTheDocument();
      expect(screen.getByText('Swap SIMP → ETH')).toBeInTheDocument();
    });
  });

  describe('Swap Calculation', () => {
    it('should calculate ETH to Token swap correctly', () => {
      render(<Swap {...defaultProps} />);

      const ethInput = screen.getByPlaceholderText('Sell ETH');
      const simpInput = screen.getByPlaceholderText('Buy SIMP');

      fireEvent.change(ethInput, { target: { value: '2' } });

      // With pool reserves ETH: 10, Token: 20 and 0.3% fee
      // Forward calculation: Spend 2 ETH, get ~3.3250 SIMP
      expect(simpInput).toHaveDisplayValue('3.3250');
    });

    it('should calculate Token to ETH swap correctly', () => {
      render(<Swap {...defaultProps} />);

      const switchButton = screen.getByRole('button', {
        name: 'Switch Direction',
      });
      fireEvent.click(switchButton);

      const ethInput = screen.getByPlaceholderText('Buy ETH');
      const simpInput = screen.getByPlaceholderText('Sell SIMP');

      fireEvent.change(simpInput, { target: { value: '5' } });

      // With pool reserves ETH: 10, Token: 20 and 0.3% fee
      // Forward calculation: Spend 5 SIMP, get ~1.9952 ETH
      expect(ethInput).toHaveDisplayValue('1.9952');
    });

    it('should handle zero pool reserves', () => {
      render(
        <Swap {...defaultProps} poolEthReserve={0n} poolTokenReserve={0n} />
      );

      const ethInput = screen.getByPlaceholderText('Sell ETH');
      const simpInput = screen.getByPlaceholderText('Buy SIMP');

      fireEvent.change(ethInput, { target: { value: '1' } });

      expect(simpInput).toHaveDisplayValue('');
    });

    it('should calculate reverse swap correctly', () => {
      render(<Swap {...defaultProps} />);

      const ethInput = screen.getByPlaceholderText('Sell ETH');
      const simpInput = screen.getByPlaceholderText('Buy SIMP');

      // ETH to Token direction: enter desired SIMP output, calculate required ETH input
      fireEvent.change(simpInput, { target: { value: '3' } });

      // Should calculate the required ETH input for 3 SIMP output
      expect(ethInput).toHaveDisplayValue('1.7700');
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

      const input = screen.getByPlaceholderText('Sell SIMP');
      fireEvent.change(input, { target: { value: '1.5' } });

      const swapButton = screen.getByText('Swap SIMP → ETH');
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
        expect(swapButton).toHaveTextContent('Swap SIMP → ETH');
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

      const input = screen.getByPlaceholderText('Sell SIMP');
      fireEvent.change(input, { target: { value: '1' } });

      const swapButton = screen.getByText('Swap SIMP → ETH');
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
        expect(swapButton).toHaveTextContent('Swap SIMP → ETH');
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

      const input = screen.getByPlaceholderText('Sell ETH');
      fireEvent.change(input, { target: { value: '1.5' } });

      const swapButton = screen.getByText('Swap ETH → SIMP');
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
        expect(swapButton).toHaveTextContent('Swap ETH → SIMP');
        expect(input).toHaveDisplayValue('');
      });
    });

    it('should handle ETH to Token swap failure', async () => {
      mockAmmContract.swap.mockRejectedValue(new Error('Transaction failed'));
      mockAmmContract.getSwapOutput.mockResolvedValue(BigInt(1e18));

      render(<Swap {...defaultProps} />);

      const input = screen.getByPlaceholderText('Sell ETH');
      fireEvent.change(input, { target: { value: '1' } });

      const swapButton = screen.getByText('Swap ETH → SIMP');
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
        expect(swapButton).toHaveTextContent('Swap ETH → SIMP');
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

      const input = screen.getByPlaceholderText('Sell SIMP');
      fireEvent.change(input, { target: { value: '1.5' } });

      expect(input).toHaveDisplayValue('1.5000');

      const swapButton = screen.getByText('Swap SIMP → ETH');
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

      const input = screen.getByPlaceholderText('Sell SIMP');
      fireEvent.change(input, { target: { value: '1.5' } });

      const swapButton = screen.getByText('Swap SIMP → ETH');
      fireEvent.click(swapButton);

      // Wait for confirmation dialog to appear and click proceed
      await waitFor(() => {
        expect(screen.getByText('Swap Confirmation')).toBeInTheDocument();
      });
      const proceedButton = screen.getByText('Proceed');
      fireEvent.click(proceedButton);

      await waitFor(() => {
        expect(mockSetErrorMessage).toHaveBeenCalled();
        expect(input).toHaveDisplayValue('1.5000'); // Should retain value
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

      const input = screen.getByPlaceholderText('Sell SIMP');
      fireEvent.change(input, { target: { value: '1.0' } });

      const swapButton = screen.getByText('Swap SIMP → ETH');
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

      const input = screen.getByPlaceholderText('Sell SIMP');
      fireEvent.change(input, { target: { value: '1.0' } });

      const swapButton = screen.getByText('Swap SIMP → ETH');
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
      const input = screen.getByPlaceholderText('Sell ETH');
      fireEvent.change(input, { target: { value: '1.0' } });

      const swapButton = screen.getByText('Swap ETH → SIMP');
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

  describe('Liquidity Limits', () => {
    it('should show "Exceeds Available Liquidity" when swap amount is too large', () => {
      render(<Swap {...defaultProps} />);

      const simpInput = screen.getByPlaceholderText('Buy SIMP');

      // Try to get more SIMP than available in pool (20 SIMP total)
      fireEvent.change(simpInput, { target: { value: '25' } });

      // Button should show liquidity exceeded message
      expect(
        screen.getByText('Exceeds Available Liquidity')
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Exceeds Available Liquidity' })
      ).toBeDisabled();
    });

    it('should show "Exceeds Available Liquidity" when ETH output exceeds reserves', () => {
      render(<Swap {...defaultProps} />);

      const switchButton = screen.getByRole('button', {
        name: 'Switch Direction',
      });
      fireEvent.click(switchButton);

      const ethInput = screen.getByPlaceholderText('Buy ETH');

      // Try to get more ETH than available in pool (10 ETH total)
      fireEvent.change(ethInput, { target: { value: '15' } });

      // Button should show liquidity exceeded message
      expect(
        screen.getByText('Exceeds Available Liquidity')
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Exceeds Available Liquidity' })
      ).toBeDisabled();
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

      const input = screen.getByPlaceholderText('Sell SIMP');
      fireEvent.change(input, { target: { value: '1' } });

      const swapButton = screen.getByText('Swap SIMP → ETH');
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

    it('should update calculated amounts when switching directions', () => {
      render(<Swap {...defaultProps} />);

      // Start with ETH to Token (default)
      const ethInput = screen.getByPlaceholderText('Sell ETH');
      const simpInput = screen.getByPlaceholderText('Buy SIMP');

      fireEvent.change(ethInput, { target: { value: '2' } });
      expect(simpInput).toHaveDisplayValue('3.3250');

      // Switch to Token to ETH
      const switchButton = screen.getByRole('button', {
        name: 'Switch Direction',
      });
      fireEvent.click(switchButton);

      // After switching direction, get inputs with new placeholders
      const ethInputAfterSwitch = screen.getByPlaceholderText('Buy ETH');
      const simpInputAfterSwitch = screen.getByPlaceholderText('Sell SIMP');

      // Inputs should be cleared when switching directions
      expect(ethInputAfterSwitch).toHaveDisplayValue('');
      expect(simpInputAfterSwitch).toHaveDisplayValue('');

      // Now input SIMP amount and check ETH calculation
      fireEvent.change(simpInputAfterSwitch, { target: { value: '5' } });
      expect(ethInputAfterSwitch).toHaveDisplayValue('1.9952');
    });
  });
});
