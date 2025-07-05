import { render, fireEvent, waitFor, act } from '@testing-library/react';
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

  it('should handle successful liquidity addition', async () => {
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

  it('should show loading state during transaction', async () => {
    const { getByRole, getByPlaceholderText } = render(
      <AddLiquidity {...defaultProps} />
    );
    const ethInput = getByPlaceholderText('Enter ETH amount');
    const button = getByRole('button', { name: 'Add Liquidity' });

    act(() => {
      fireEvent.change(ethInput, { target: { value: '5' } });
      fireEvent.click(button);
    });

    expect(getByRole('button', { name: 'Waiting...' })).toBeTruthy();
  });

  it('should handle transaction errors', async () => {
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

    await waitFor(() => {
      expect(mockSetErrorMessage).toHaveBeenCalledWith(
        'Add liquidity failed: Transaction failed'
      );
    });
  });

  it('should use SIMP token symbol', () => {
    const { getByPlaceholderText } = render(<AddLiquidity {...defaultProps} />);

    expect(getByPlaceholderText('Enter SIMP amount')).toBeTruthy();
  });
});
