import {
  render,
  fireEvent,
  waitFor,
  act,
  screen,
} from '@testing-library/react';
import { vi } from 'vitest';
import { AddLiquidity } from './AddLiquidity';
import { createMockContracts, mockContractAddresses } from '../../test-mocks';

const mockSetErrorMessage = vi.fn();
vi.mock('../../contexts/ErrorMessageContext', () => ({
  useErrorMessage: () => ({
    setErrorMessage: mockSetErrorMessage,
  }),
}));

const { mockTokenContract, mockAmmContract, tokenContract, ammContract } =
  createMockContracts();

const mockOnLiquidityComplete = vi.fn();

const defaultProps = {
  ammContract,
  tokenContract,
  poolEthReserve: BigInt(10e18), // 10 ETH in wei
  poolTokenReserve: BigInt(20e18), // 20 tokens in wei
  onLiquidityComplete: mockOnLiquidityComplete,
};

describe('AddLiquidity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSetErrorMessage.mockClear();
    mockTokenContract.approve.mockResolvedValue({
      wait: vi.fn().mockResolvedValue({}),
    });
    mockAmmContract.addLiquidity.mockResolvedValue({
      wait: vi.fn().mockResolvedValue({}),
    });
  });

  it('should render input fields with correct placeholders', () => {
    const { getByPlaceholderText } = render(<AddLiquidity {...defaultProps} />);
    expect(getByPlaceholderText('Enter ETH amount')).toBeTruthy();
    expect(getByPlaceholderText('Enter SIMP amount')).toBeTruthy();
  });

  it('should calculate corresponding token amount when ETH amount changes', () => {
    const { getByPlaceholderText } = render(<AddLiquidity {...defaultProps} />);
    const ethInput = getByPlaceholderText('Enter ETH amount');
    const tokenInput = getByPlaceholderText('Enter SIMP amount');

    act(() => {
      fireEvent.change(ethInput, { target: { value: '5' } });
    });

    // Pool ratio: 20 SIMP / 10 ETH = 2:1
    expect(tokenInput).toHaveValue(10);
  });

  it('should calculate corresponding ETH amount when token amount changes', () => {
    const { getByPlaceholderText } = render(<AddLiquidity {...defaultProps} />);
    const ethInput = getByPlaceholderText('Enter ETH amount');
    const tokenInput = getByPlaceholderText('Enter SIMP amount');

    act(() => {
      fireEvent.change(tokenInput, { target: { value: '10' } });
    });

    // Pool ratio: 10 ETH / 20 SIMP = 1:2
    expect(ethInput).toHaveValue(5);
  });

  it('should not auto-calculate when pool is empty', () => {
    const emptyPoolProps = {
      ...defaultProps,
      poolEthReserve: 0n,
      poolTokenReserve: 0n,
    };
    const { getByPlaceholderText } = render(
      <AddLiquidity {...emptyPoolProps} />
    );
    const ethInput = getByPlaceholderText('Enter ETH amount');
    const tokenInput = getByPlaceholderText('Enter SIMP amount');

    act(() => {
      fireEvent.change(ethInput, { target: { value: '5' } });
    });

    expect(tokenInput).toHaveDisplayValue('');
  });

  it('should disable button when amounts are zero', () => {
    const { getByRole } = render(<AddLiquidity {...defaultProps} />);
    const button = getByRole('button', { name: 'Add Liquidity' });
    expect(button).toBeDisabled();
  });

  it('should enable button when both amounts are provided', () => {
    const { getByRole, getByPlaceholderText } = render(
      <AddLiquidity {...defaultProps} />
    );
    const ethInput = getByPlaceholderText('Enter ETH amount');
    const button = getByRole('button', { name: 'Add Liquidity' });

    act(() => {
      fireEvent.change(ethInput, { target: { value: '5' } });
    });

    expect(button).toBeEnabled();
  });

  it('should show confirmation dialog when add liquidity is clicked', async () => {
    mockAmmContract.getLiquidityOutput.mockResolvedValue(BigInt(1e18));

    const { getByRole, getByPlaceholderText } = render(
      <AddLiquidity {...defaultProps} />
    );
    const ethInput = getByPlaceholderText('Enter ETH amount');
    const button = getByRole('button', { name: 'Add Liquidity' });

    act(() => {
      fireEvent.change(ethInput, { target: { value: '5' } });
      fireEvent.click(button);
    });

    await waitFor(() => {
      expect(
        screen.getByText('Add Liquidity Confirmation')
      ).toBeInTheDocument();
      expect(screen.getByText('Expected Output:')).toBeInTheDocument();
      expect(screen.getByText('ETH: 5.0000')).toBeInTheDocument();
      expect(screen.getByText('SIMP: 10.0000')).toBeInTheDocument();
      expect(
        screen.getByText('Expected LP Tokens: 1.0000')
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Proceed' })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Cancel' })
      ).toBeInTheDocument();
    });
  });

  it('should handle successful liquidity addition after dialog confirmation', async () => {
    mockAmmContract.getLiquidityOutput.mockResolvedValue(BigInt(1e18));

    const { getByRole, getByPlaceholderText } = render(
      <AddLiquidity {...defaultProps} />
    );
    const ethInput = getByPlaceholderText('Enter ETH amount');
    const button = getByRole('button', { name: 'Add Liquidity' });

    act(() => {
      fireEvent.change(ethInput, { target: { value: '5' } });
      fireEvent.click(button);
    });

    // Wait for dialog to appear and click proceed
    await waitFor(() => {
      expect(
        screen.getByText('Add Liquidity Confirmation')
      ).toBeInTheDocument();
    });

    const proceedButton = screen.getByRole('button', { name: 'Proceed' });
    act(() => {
      fireEvent.click(proceedButton);
    });

    await waitFor(() => {
      expect(mockTokenContract.approve).toHaveBeenCalledWith(
        mockContractAddresses.ammPoolAddress,
        BigInt(10e18)
      );
      expect(mockAmmContract.addLiquidity).toHaveBeenCalledWith(
        BigInt(10e18),
        BigInt(0.995e18), // 0.5% slippage protection applied to 1 ETH
        { value: BigInt(5e18) }
      );
      expect(mockOnLiquidityComplete).toHaveBeenCalled();
    });

    // Form should be reset
    expect(ethInput).toHaveDisplayValue('');
  });

  it('should cancel liquidity addition when dialog is cancelled', async () => {
    mockAmmContract.getLiquidityOutput.mockResolvedValue(BigInt(1e18));

    const { getByRole, getByPlaceholderText } = render(
      <AddLiquidity {...defaultProps} />
    );
    const ethInput = getByPlaceholderText('Enter ETH amount');
    const button = getByRole('button', { name: 'Add Liquidity' });

    act(() => {
      fireEvent.change(ethInput, { target: { value: '5' } });
      fireEvent.click(button);
    });

    // Wait for dialog to appear and click cancel
    await waitFor(() => {
      expect(
        screen.getByText('Add Liquidity Confirmation')
      ).toBeInTheDocument();
    });

    const cancelButton = screen.getByRole('button', { name: 'Cancel' });
    act(() => {
      fireEvent.click(cancelButton);
    });

    await waitFor(() => {
      expect(
        screen.queryByText('Add Liquidity Confirmation')
      ).not.toBeInTheDocument();
    });

    // Should not proceed with transaction
    expect(mockTokenContract.approve).not.toHaveBeenCalled();
    expect(mockAmmContract.addLiquidity).not.toHaveBeenCalled();
    expect(mockOnLiquidityComplete).not.toHaveBeenCalled();

    // Form should still have values (now preserves user input format)
    expect(ethInput).toHaveDisplayValue('5');
  });

  it('should show loading state during dialog confirmation', async () => {
    mockAmmContract.getLiquidityOutput.mockResolvedValue(BigInt(1e18));

    const { getByRole, getByPlaceholderText } = render(
      <AddLiquidity {...defaultProps} />
    );
    const ethInput = getByPlaceholderText('Enter ETH amount');
    const button = getByRole('button', { name: 'Add Liquidity' });

    act(() => {
      fireEvent.change(ethInput, { target: { value: '5' } });
      fireEvent.click(button);
    });

    // Should show dialog, not loading state initially
    await waitFor(() => {
      expect(
        screen.getByText('Add Liquidity Confirmation')
      ).toBeInTheDocument();
    });

    const proceedButton = screen.getByRole('button', { name: 'Proceed' });
    act(() => {
      fireEvent.click(proceedButton);
    });

    // Now should show loading state
    expect(getByRole('button', { name: 'Waiting...' })).toBeTruthy();
  });

  it('should handle transaction errors after dialog confirmation', async () => {
    mockAmmContract.getLiquidityOutput.mockResolvedValue(BigInt(1e18));
    mockTokenContract.approve.mockRejectedValue(
      new Error('Transaction failed')
    );

    const { getByRole, getByPlaceholderText } = render(
      <AddLiquidity {...defaultProps} />
    );
    const ethInput = getByPlaceholderText('Enter ETH amount');
    const button = getByRole('button', { name: 'Add Liquidity' });

    act(() => {
      fireEvent.change(ethInput, { target: { value: '5' } });
      fireEvent.click(button);
    });

    // Wait for dialog and confirm
    await waitFor(() => {
      expect(
        screen.getByText('Add Liquidity Confirmation')
      ).toBeInTheDocument();
    });

    const proceedButton = screen.getByRole('button', { name: 'Proceed' });
    act(() => {
      fireEvent.click(proceedButton);
    });

    await waitFor(() => {
      expect(mockSetErrorMessage).toHaveBeenCalledWith(
        'Add liquidity failed: Transaction failed'
      );
    });
  });

  it('should handle errors when getting liquidity output', async () => {
    mockAmmContract.getLiquidityOutput.mockRejectedValue(
      new Error('Contract call failed')
    );

    const { getByRole, getByPlaceholderText } = render(
      <AddLiquidity {...defaultProps} />
    );
    const ethInput = getByPlaceholderText('Enter ETH amount');
    const button = getByRole('button', { name: 'Add Liquidity' });

    act(() => {
      fireEvent.change(ethInput, { target: { value: '5' } });
      fireEvent.click(button);
    });

    await waitFor(() => {
      expect(mockSetErrorMessage).toHaveBeenCalledWith(
        'Add liquidity failed: Contract call failed'
      );
    });

    // Should not show dialog
    expect(
      screen.queryByText('Add Liquidity Confirmation')
    ).not.toBeInTheDocument();
  });

  it('should use SIMP token symbol', () => {
    const { getByPlaceholderText } = render(<AddLiquidity {...defaultProps} />);

    expect(getByPlaceholderText('Enter SIMP amount')).toBeTruthy();
  });
});
