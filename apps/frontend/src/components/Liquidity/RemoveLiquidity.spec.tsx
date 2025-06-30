import { render, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { RemoveLiquidity } from './RemoveLiquidity';
import { createMockContracts } from '../../test-mocks';

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
  tokenSymbol: 'SIMP',
  onLiquidityComplete: mockOnLiquidityComplete,
};

describe('RemoveLiquidity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAmmContract.removeLiquidity.mockResolvedValue({
      wait: vi.fn().mockResolvedValue({}),
    });
  });

  it('should render LP token input with max placeholder', () => {
    const { getByText, getByPlaceholderText } = render(
      <RemoveLiquidity {...defaultProps} />
    );

    expect(getByText('LP Tokens to Remove')).toBeTruthy();
    expect(getByPlaceholderText('Max: 5.0000')).toBeTruthy();
  });

  it('should show max button', () => {
    const { getByRole } = render(<RemoveLiquidity {...defaultProps} />);

    expect(getByRole('button', { name: 'Max' })).toBeTruthy();
  });

  it('should set max LP tokens when max button clicked', () => {
    const { getByRole, getByPlaceholderText } = render(
      <RemoveLiquidity {...defaultProps} />
    );

    const maxButton = getByRole('button', { name: 'Max' });
    fireEvent.click(maxButton);

    const input = getByPlaceholderText('Max: 5.0000');
    expect(input).toHaveValue(5);
  });

  it('should calculate remove output correctly', () => {
    const { getByPlaceholderText, getByText } = render(
      <RemoveLiquidity {...defaultProps} />
    );

    const lpInput = getByPlaceholderText('Max: 5.0000');
    fireEvent.change(lpInput, { target: { value: '2.5' } });

    expect(getByText('You will receive:')).toBeTruthy();
    // 2.5 LP tokens out of 10 total = 25% of pool
    // 25% of 10 ETH = 2.5 ETH
    // 25% of 20 SIMP = 5 SIMP
    expect(getByText(/2\.5000 ETH/)).toBeTruthy();
    expect(getByText(/5\.0000 SIMP/)).toBeTruthy();
  });

  it('should not show output when LP amount is zero', () => {
    const { queryByText } = render(<RemoveLiquidity {...defaultProps} />);

    expect(queryByText('You will receive:')).toBeFalsy();
  });

  it('should execute remove liquidity successfully', async () => {
    const { getByRole, getByPlaceholderText } = render(
      <RemoveLiquidity {...defaultProps} />
    );

    const lpInput = getByPlaceholderText('Max: 5.0000');
    fireEvent.change(lpInput, { target: { value: '2.5' } });

    const removeButton = getByRole('button', { name: 'Remove Liquidity' });
    fireEvent.click(removeButton);

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

    const lpInput = getByPlaceholderText('Max: 5.0000');
    fireEvent.change(lpInput, { target: { value: '2.5' } });

    const removeButton = getByRole('button', { name: 'Remove Liquidity' });
    fireEvent.click(removeButton);

    expect(getByRole('button', { name: 'Waiting...' })).toBeTruthy();
  });

  it('should handle transaction errors', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    mockAmmContract.removeLiquidity.mockRejectedValue(
      new Error('Transaction failed')
    );

    const { getByRole, getByPlaceholderText } = render(
      <RemoveLiquidity {...defaultProps} />
    );

    const lpInput = getByPlaceholderText('Max: 5.0000');
    fireEvent.change(lpInput, { target: { value: '2.5' } });

    const removeButton = getByRole('button', { name: 'Remove Liquidity' });
    fireEvent.click(removeButton);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        'Failed to remove liquidity: Transaction failed'
      );
    });

    alertSpy.mockRestore();
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

    const lpInput = getByPlaceholderText('Max: 5.0000');
    fireEvent.change(lpInput, { target: { value: '10' } });

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

    const { getByPlaceholderText, queryByText } = render(
      <RemoveLiquidity {...zeroLPProps} />
    );

    const lpInput = getByPlaceholderText('Max: 0.0000');
    fireEvent.change(lpInput, { target: { value: '1' } });

    expect(queryByText('You will receive:')).toBeFalsy();
  });
});
