import { render, fireEvent, waitFor, act } from '@testing-library/react';
import { vi } from 'vitest';
import { RemoveLiquidity } from './RemoveLiquidity';
import { createMockContracts } from '../../test-mocks';

const mockSetErrorMessage = vi.fn();
vi.mock('../../contexts/ErrorMessageContext', () => ({
  useErrorMessage: () => ({
    setErrorMessage: mockSetErrorMessage,
  }),
}));

const { mockAmmContract, ammContract } = createMockContracts();

const mockOnLiquidityComplete = vi.fn();

const defaultProps = {
  ammContract,
  poolEthReserve: 10.0,
  poolTokenReserve: 20.0,
  lpTokenBalances: {
    userLPTokens: 5.0,
    totalLPTokens: 10.0,
    poolOwnershipPercentage: 50.0,
  },
  onLiquidityComplete: mockOnLiquidityComplete,
};

describe('RemoveLiquidity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSetErrorMessage.mockClear();
    mockAmmContract.removeLiquidity.mockResolvedValue({
      wait: vi.fn().mockResolvedValue({}),
    });
  });

  it('should render LP token input with placeholder', () => {
    const { getByPlaceholderText } = render(
      <RemoveLiquidity {...defaultProps} />
    );

    expect(getByPlaceholderText('LP Tokens to Remove')).toBeTruthy();
  });

  it('should show expected output', () => {
    const { getByText } = render(<RemoveLiquidity {...defaultProps} />);

    // When no input, should show default output
    expect(getByText('0.0000 SIMP + 0.0000 ETH')).toBeTruthy();
  });

  it('should calculate output correctly when LP tokens entered', () => {
    const { getByPlaceholderText, getByText } = render(
      <RemoveLiquidity {...defaultProps} />
    );

    const lpInput = getByPlaceholderText('LP Tokens to Remove');
    act(() => {
      fireEvent.change(lpInput, { target: { value: '2.5' } });
    });

    // 2.5 LP tokens out of 10 total = 25% of pool
    // 25% of 10 ETH = 2.5 ETH
    // 25% of 20 SIMP = 5 SIMP
    expect(getByText('5.0000 SIMP + 2.5000 ETH')).toBeTruthy();
  });

  it('should show zero output when input is empty', () => {
    const { getByPlaceholderText, getByText } = render(
      <RemoveLiquidity {...defaultProps} />
    );

    const lpInput = getByPlaceholderText('LP Tokens to Remove');
    act(() => {
      fireEvent.change(lpInput, { target: { value: '' } });
    });

    expect(getByText('0.0000 SIMP + 0.0000 ETH')).toBeTruthy();
  });

  it('should handle decimal input values', () => {
    const { getByPlaceholderText, getByText } = render(
      <RemoveLiquidity {...defaultProps} />
    );

    const lpInput = getByPlaceholderText('LP Tokens to Remove');
    act(() => {
      fireEvent.change(lpInput, { target: { value: '1.5' } });
    });

    // 1.5 LP tokens out of 10 total = 15% of pool
    // 15% of 20 SIMP = 3 SIMP
    // 15% of 10 ETH = 1.5 ETH
    expect(getByText('3.0000 SIMP + 1.5000 ETH')).toBeTruthy();
  });

  it('should execute remove liquidity successfully', async () => {
    const { getByRole, getByPlaceholderText } = render(
      <RemoveLiquidity {...defaultProps} />
    );

    const lpInput = getByPlaceholderText('LP Tokens to Remove');
    const removeButton = getByRole('button', { name: 'Remove Liquidity' });

    act(() => {
      fireEvent.change(lpInput, { target: { value: '2.5' } });
      fireEvent.click(removeButton);
    });

    await waitFor(() => {
      expect(mockAmmContract.removeLiquidity).toHaveBeenCalledWith(
        BigInt(2.5 * 1e18)
      );
      expect(mockOnLiquidityComplete).toHaveBeenCalled();
    });

    // Input should be reset
    expect(lpInput).toHaveDisplayValue('');
  });

  it('should show loading state during transaction', async () => {
    const { getByRole, getByPlaceholderText } = render(
      <RemoveLiquidity {...defaultProps} />
    );

    const lpInput = getByPlaceholderText('LP Tokens to Remove');
    const removeButton = getByRole('button', { name: 'Remove Liquidity' });

    act(() => {
      fireEvent.change(lpInput, { target: { value: '2.5' } });
      fireEvent.click(removeButton);
    });

    await waitFor(() => {
      expect(getByRole('button', { name: 'Waiting...' })).toBeTruthy();
    });
  });

  it('should handle transaction errors', async () => {
    mockAmmContract.removeLiquidity.mockRejectedValue(
      new Error('Transaction failed')
    );

    const { getByRole, getByPlaceholderText } = render(
      <RemoveLiquidity {...defaultProps} />
    );

    const lpInput = getByPlaceholderText('LP Tokens to Remove');
    const removeButton = getByRole('button', { name: 'Remove Liquidity' });

    act(() => {
      fireEvent.change(lpInput, { target: { value: '2.5' } });
      fireEvent.click(removeButton);
    });

    await waitFor(() => {
      expect(mockSetErrorMessage).toHaveBeenCalledWith(
        'Remove liquidity failed: Transaction failed'
      );
    });
  });

  it('should disable remove button when LP amount is zero', () => {
    const { getByRole } = render(<RemoveLiquidity {...defaultProps} />);

    const removeButton = getByRole('button', { name: 'Remove Liquidity' });
    expect(removeButton).toBeDisabled();
  });

  it('should disable remove button when LP amount exceeds balance', () => {
    const { getByRole, getByPlaceholderText } = render(
      <RemoveLiquidity {...defaultProps} />
    );

    const lpInput = getByPlaceholderText('LP Tokens to Remove');
    act(() => {
      fireEvent.change(lpInput, { target: { value: '10' } });
    });

    const removeButton = getByRole('button', { name: 'Remove Liquidity' });
    expect(removeButton).toBeDisabled();
  });

  it('should handle pools with zero total LP tokens', () => {
    const zeroLPProps = {
      ...defaultProps,
      lpTokenBalances: {
        userLPTokens: 0,
        totalLPTokens: 0,
        poolOwnershipPercentage: 0,
      },
    };

    const { getByPlaceholderText, getByText } = render(
      <RemoveLiquidity {...zeroLPProps} />
    );

    const lpInput = getByPlaceholderText('LP Tokens to Remove');
    act(() => {
      fireEvent.change(lpInput, { target: { value: '1' } });
    });

    // With zero total LP tokens, output should be zero
    expect(getByText('0.0000 SIMP + 0.0000 ETH')).toBeTruthy();
  });
});
