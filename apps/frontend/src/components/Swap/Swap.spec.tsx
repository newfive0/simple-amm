import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ethers } from 'ethers';
import { Swap } from './Swap';
import { 
  createDeferredTransactionPromise, 
  createMockContracts, 
  mockContractAddresses
} from '../../test-mocks';


// Create mock contracts
const { mockTokenContract, mockAmmContract, tokenContract, ammContract } = createMockContracts();

const mockOnSwapComplete = vi.fn();

const defaultProps = {
  ammContract,
  tokenContract,
  contractAddresses: mockContractAddresses,
  poolEthBalance: '10.0',
  poolTokenBalance: '20.0',
  tokenSymbol: 'SIMP',
  onSwapComplete: mockOnSwapComplete,
};

describe('Swap Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render swap component with default ETH to Token direction', () => {
      render(<Swap {...defaultProps} />);
      
      expect(screen.getByText('Swap Tokens')).toBeInTheDocument();
      expect(screen.getByText('Swap Direction')).toBeInTheDocument();
      expect(screen.getByDisplayValue('ETH → SIMP')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter ETH amount')).toBeInTheDocument();
      expect(screen.getByText('Swap ETH for SIMP')).toBeInTheDocument();
    });

    it('should render Token to ETH direction when selected', () => {
      render(<Swap {...defaultProps} />);
      
      const selector = screen.getByDisplayValue('ETH → SIMP');
      fireEvent.change(selector, { target: { value: 'token-to-eth' } });
      
      expect(screen.getByDisplayValue('SIMP → ETH')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter SIMP amount')).toBeInTheDocument();
      expect(screen.getByText('Swap SIMP for ETH')).toBeInTheDocument();
    });

    it('should show expected output calculation', () => {
      render(<Swap {...defaultProps} />);
      
      const input = screen.getByPlaceholderText('Enter ETH amount');
      fireEvent.change(input, { target: { value: '1' } });
      
      // With pool balances ETH: 10, Token: 20
      // Expected output: (20 * 1) / (10 + 1) = 1.818182
      expect(screen.getByText(/≈ 1\.818182 SIMP/)).toBeInTheDocument();
    });

    it('should show zero output when no input amount', () => {
      render(<Swap {...defaultProps} />);
      
      expect(screen.getByText('≈ 0 SIMP')).toBeInTheDocument();
    });
  });

  describe('Swap Calculation', () => {
    it('should calculate ETH to Token swap correctly', () => {
      render(<Swap {...defaultProps} />);
      
      const input = screen.getByPlaceholderText('Enter ETH amount');
      fireEvent.change(input, { target: { value: '2' } });
      
      // With pool balances ETH: 10, Token: 20
      // Expected output: (20 * 2) / (10 + 2) = 3.333333
      expect(screen.getByText(/≈ 3\.333333 SIMP/)).toBeInTheDocument();
    });

    it('should calculate Token to ETH swap correctly', () => {
      render(<Swap {...defaultProps} />);
      
      const selector = screen.getByDisplayValue('ETH → SIMP');
      fireEvent.change(selector, { target: { value: 'token-to-eth' } });
      
      const input = screen.getByPlaceholderText('Enter SIMP amount');
      fireEvent.change(input, { target: { value: '5' } });
      
      // With pool balances ETH: 10, Token: 20
      // Expected output: (10 * 5) / (20 + 5) = 2.000000
      expect(screen.getByText(/≈ 2\.000000 ETH/)).toBeInTheDocument();
    });

    it('should handle zero pool balances', () => {
      render(<Swap {...defaultProps} poolEthBalance="0" poolTokenBalance="0" />);
      
      const input = screen.getByPlaceholderText('Enter ETH amount');
      fireEvent.change(input, { target: { value: '1' } });
      
      expect(screen.getByText('≈ 0 SIMP')).toBeInTheDocument();
    });

    it('should handle invalid input amounts', () => {
      render(<Swap {...defaultProps} />);
      
      const input = screen.getByPlaceholderText('Enter ETH amount');
      fireEvent.change(input, { target: { value: 'invalid' } });
      
      expect(screen.getByText('≈ 0 SIMP')).toBeInTheDocument();
    });
  });

  describe('ETH to Token Swap', () => {
    it('should execute ETH to Token swap successfully', async () => {
      const { promise, resolve } = createDeferredTransactionPromise();
      mockAmmContract.swap.mockResolvedValue(promise);
      
      render(<Swap {...defaultProps} />);
      
      const input = screen.getByPlaceholderText('Enter ETH amount');
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
          { value: BigInt(15) * BigInt(10 ** 17) } // 1.5 ETH in wei
        );
      });
      
      await waitFor(() => {
        expect(mockOnSwapComplete).toHaveBeenCalled();
        expect(swapButton).toHaveTextContent('Swap ETH for SIMP');
        expect(input).toHaveDisplayValue('');
      });
    });

    it('should handle ETH to Token swap failure', async () => {
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      mockAmmContract.swap.mockRejectedValue(new Error('Transaction failed'));
      
      render(<Swap {...defaultProps} />);
      
      const input = screen.getByPlaceholderText('Enter ETH amount');
      fireEvent.change(input, { target: { value: '1' } });
      
      const swapButton = screen.getByText('Swap ETH for SIMP');
      fireEvent.click(swapButton);
      
      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('Swap failed: Transaction failed');
        expect(swapButton).toHaveTextContent('Swap ETH for SIMP');
        expect(swapButton).not.toBeDisabled();
      });
      
      alertSpy.mockRestore();
    });

    it('should disable swap button when no amount entered', () => {
      render(<Swap {...defaultProps} />);
      
      const swapButton = screen.getByText('Swap ETH for SIMP');
      expect(swapButton).toBeDisabled();
    });
  });

  describe('Token to ETH Swap', () => {
    it('should execute Token to ETH swap successfully', async () => {
      const { promise: approvePromise, resolve: resolveApprove } = createDeferredTransactionPromise();
      const { promise: swapPromise, resolve: resolveSwap } = createDeferredTransactionPromise();
      
      mockTokenContract.approve.mockResolvedValue(approvePromise);
      mockAmmContract.swap.mockResolvedValue(swapPromise);
      
      render(<Swap {...defaultProps} />);
      
      // Switch to token to ETH
      const selector = screen.getByDisplayValue('ETH → SIMP');
      fireEvent.change(selector, { target: { value: 'token-to-eth' } });
      
      const input = screen.getByPlaceholderText('Enter SIMP amount');
      fireEvent.change(input, { target: { value: '2.5' } });
      
      const swapButton = screen.getByText('Swap SIMP for ETH');
      fireEvent.click(swapButton);
      
      expect(swapButton).toHaveTextContent('Waiting...');
      expect(swapButton).toBeDisabled();
      
      // Resolve approve first
      resolveApprove();
      await waitFor(() => {
        expect(mockTokenContract.approve).toHaveBeenCalledWith(
          mockContractAddresses.ammPoolAddress,
          BigInt(25) * BigInt(10 ** 17) // 2.5 ETH in wei
        );
      });
      
      // Then resolve swap
      resolveSwap();
      await waitFor(() => {
        expect(mockAmmContract.swap).toHaveBeenCalledWith(
          mockContractAddresses.tokenAddress,
          BigInt(25) * BigInt(10 ** 17) // 2.5 ETH in wei
        );
      });
      
      await waitFor(() => {
        expect(mockOnSwapComplete).toHaveBeenCalled();
        expect(swapButton).toHaveTextContent('Swap SIMP for ETH');
        expect(input).toHaveDisplayValue('');
      });
    });

    it('should handle Token to ETH swap failure during approval', async () => {
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      mockTokenContract.approve.mockRejectedValue(new Error('Approval failed'));
      
      render(<Swap {...defaultProps} />);
      
      // Switch to token to ETH
      const selector = screen.getByDisplayValue('ETH → SIMP');
      fireEvent.change(selector, { target: { value: 'token-to-eth' } });
      
      const input = screen.getByPlaceholderText('Enter SIMP amount');
      fireEvent.change(input, { target: { value: '1' } });
      
      const swapButton = screen.getByText('Swap SIMP for ETH');
      fireEvent.click(swapButton);
      
      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('Swap failed: Approval failed');
        expect(swapButton).toHaveTextContent('Swap SIMP for ETH');
        expect(swapButton).not.toBeDisabled();
      });
      
      alertSpy.mockRestore();
    });

    it('should handle Token to ETH swap failure during swap', async () => {
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      const { promise: approvePromise, resolve: resolveApprove } = createDeferredTransactionPromise();
      
      mockTokenContract.approve.mockResolvedValue(approvePromise);
      mockAmmContract.swap.mockRejectedValue(new Error('Swap failed'));
      
      render(<Swap {...defaultProps} />);
      
      // Switch to token to ETH
      const selector = screen.getByDisplayValue('ETH → SIMP');
      fireEvent.change(selector, { target: { value: 'token-to-eth' } });
      
      const input = screen.getByPlaceholderText('Enter SIMP amount');
      fireEvent.change(input, { target: { value: '1' } });
      
      const swapButton = screen.getByText('Swap SIMP for ETH');
      fireEvent.click(swapButton);
      
      // Resolve approve first
      resolveApprove();
      await waitFor(() => {
        expect(mockTokenContract.approve).toHaveBeenCalled();
      });
      
      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('Swap failed: Swap failed');
        expect(swapButton).toHaveTextContent('Swap SIMP for ETH');
        expect(swapButton).not.toBeDisabled();
      });
      
      alertSpy.mockRestore();
    });
  });

  describe('Loading States', () => {
    it('should show loading state during swap', async () => {
      const { promise, resolve } = createDeferredTransactionPromise();
      mockAmmContract.swap.mockResolvedValue(promise);
      
      render(<Swap {...defaultProps} />);
      
      const input = screen.getByPlaceholderText('Enter ETH amount');
      fireEvent.change(input, { target: { value: '1' } });
      
      const swapButton = screen.getByText('Swap ETH for SIMP');
      fireEvent.click(swapButton);
      
      expect(swapButton).toHaveTextContent('Waiting...');
      expect(swapButton).toBeDisabled();
      
      resolve();
      await waitFor(() => {
        expect(swapButton).toHaveTextContent('Swap ETH for SIMP');
        expect(swapButton).toBeDisabled(); // Still disabled because input is now empty
      });
    });
  });

  describe('Form Reset', () => {
    it('should reset form after successful swap', async () => {
      const { promise, resolve } = createDeferredTransactionPromise();
      mockAmmContract.swap.mockResolvedValue(promise);
      
      render(<Swap {...defaultProps} />);
      
      const input = screen.getByPlaceholderText('Enter ETH amount');
      fireEvent.change(input, { target: { value: '1.5' } });
      
      expect(input).toHaveDisplayValue('1.5');
      
      const swapButton = screen.getByText('Swap ETH for SIMP');
      fireEvent.click(swapButton);
      
      resolve();
      await waitFor(() => {
        expect(input).toHaveDisplayValue('');
      });
    });

    it('should not reset form after failed swap', async () => {
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      mockAmmContract.swap.mockRejectedValue(new Error('Failed'));
      
      render(<Swap {...defaultProps} />);
      
      const input = screen.getByPlaceholderText('Enter ETH amount');
      fireEvent.change(input, { target: { value: '1.5' } });
      
      const swapButton = screen.getByText('Swap ETH for SIMP');
      fireEvent.click(swapButton);
      
      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalled();
        expect(input).toHaveDisplayValue('1.5'); // Should retain value
      });
      
      alertSpy.mockRestore();
    });
  });

  describe('Edge Cases', () => {
    it('should handle unknown error types', async () => {
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      mockAmmContract.swap.mockRejectedValue('string error');
      
      render(<Swap {...defaultProps} />);
      
      const input = screen.getByPlaceholderText('Enter ETH amount');
      fireEvent.change(input, { target: { value: '1' } });
      
      const swapButton = screen.getByText('Swap ETH for SIMP');
      fireEvent.click(swapButton);
      
      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('Swap failed: Unknown error occurred');
      });
      
      alertSpy.mockRestore();
    });

    it('should handle empty amounts in swap functions', async () => {
      render(<Swap {...defaultProps} />);
      
      // Try to swap with empty amount
      const swapButton = screen.getByText('Swap ETH for SIMP');
      fireEvent.click(swapButton);
      
      // Should not call contract
      expect(mockAmmContract.swap).not.toHaveBeenCalled();
    });

    it('should update expected output when switching directions', () => {
      render(<Swap {...defaultProps} />);
      
      // Start with ETH to Token
      const ethInput = screen.getByPlaceholderText('Enter ETH amount');
      fireEvent.change(ethInput, { target: { value: '1' } });
      expect(screen.getByText(/≈ 1\.818182 SIMP/)).toBeInTheDocument();
      
      // Switch to Token to ETH
      const selector = screen.getByDisplayValue('ETH → SIMP');
      fireEvent.change(selector, { target: { value: 'token-to-eth' } });
      
      const tokenInput = screen.getByPlaceholderText('Enter SIMP amount');
      fireEvent.change(tokenInput, { target: { value: '1' } });
      expect(screen.getByText(/≈ 0\.476190 ETH/)).toBeInTheDocument();
    });
  });
});