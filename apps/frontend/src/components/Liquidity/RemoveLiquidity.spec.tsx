import { render, fireEvent, waitFor, act } from '@testing-library/react';
import { vi } from 'vitest';
import { RemoveLiquidity } from './RemoveLiquidity';
import {
  createMockContracts,
  createDeferredPromise,
  createDeferredTransactionPromise,
} from '../../test-mocks';

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
  poolEthReserve: BigInt(10e18), // 10 ETH in wei
  poolTokenReserve: BigInt(20e18), // 20 tokens in wei
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
    mockAmmContract.getRemoveLiquidityOutput.mockResolvedValue([
      BigInt(0), // Default 0 SIMP
      BigInt(0), // Default 0 ETH
    ]);
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

  it('should show confirmation dialog when remove liquidity is clicked', async () => {
    mockAmmContract.getRemoveLiquidityOutput.mockResolvedValue([
      BigInt(5e18), // 5 SIMP
      BigInt(2.5e18), // 2.5 ETH
    ]);

    const { getByRole, getByPlaceholderText, getByText } = render(
      <RemoveLiquidity {...defaultProps} />
    );

    const lpInput = getByPlaceholderText('LP Tokens to Remove');
    const removeButton = getByRole('button', { name: 'Remove Liquidity' });

    act(() => {
      fireEvent.change(lpInput, { target: { value: '2.5' } });
      fireEvent.click(removeButton);
    });

    await waitFor(() => {
      expect(mockAmmContract.getRemoveLiquidityOutput).toHaveBeenCalledWith(
        BigInt(2.5e18)
      );
      expect(getByText('Confirm Remove Liquidity')).toBeTruthy();
      expect(
        getByText(/Are you sure you want to remove.*2.5.*LP tokens/)
      ).toBeTruthy();
      expect(getByText('You will receive:')).toBeTruthy();

      // Find the dialog and check for the specific amounts within it
      const dialog = document.querySelector('[class*="dialog"]');
      expect(dialog?.textContent).toContain('5.0000 SIMP');
      expect(dialog?.textContent).toContain('2.5000 ETH');
    });
  });

  it('should execute remove liquidity when confirmation dialog is confirmed', async () => {
    mockAmmContract.getRemoveLiquidityOutput.mockResolvedValue([
      BigInt(5e18), // 5 SIMP
      BigInt(2.5e18), // 2.5 ETH
    ]);

    const { getByRole, getByPlaceholderText } = render(
      <RemoveLiquidity {...defaultProps} />
    );

    const lpInput = getByPlaceholderText('LP Tokens to Remove');
    const removeButton = getByRole('button', { name: 'Remove Liquidity' });

    // Click remove liquidity button
    act(() => {
      fireEvent.change(lpInput, { target: { value: '2.5' } });
      fireEvent.click(removeButton);
    });

    // Wait for confirmation dialog and click confirm
    await waitFor(() => {
      const confirmButton = getByRole('button', { name: 'Remove' });
      act(() => {
        fireEvent.click(confirmButton);
      });
    });

    await waitFor(() => {
      expect(mockAmmContract.removeLiquidity).toHaveBeenCalledWith(
        BigInt(2.5e18),
        BigInt(4.975e18), // 5 SIMP with 0.5% slippage protection
        BigInt(2.4875e18) // 2.5 ETH with 0.5% slippage protection
      );
      expect(mockOnLiquidityComplete).toHaveBeenCalled();
    });

    // Input should be reset
    expect(lpInput).toHaveDisplayValue('');
  });

  it('should cancel transaction when confirmation dialog is cancelled', async () => {
    mockAmmContract.getRemoveLiquidityOutput.mockResolvedValue([
      BigInt(5e18), // 5 SIMP
      BigInt(2.5e18), // 2.5 ETH
    ]);

    const { getByRole, getByPlaceholderText, queryByText } = render(
      <RemoveLiquidity {...defaultProps} />
    );

    const lpInput = getByPlaceholderText('LP Tokens to Remove');
    const removeButton = getByRole('button', { name: 'Remove Liquidity' });

    // Click remove liquidity button
    act(() => {
      fireEvent.change(lpInput, { target: { value: '2.5' } });
      fireEvent.click(removeButton);
    });

    // Wait for confirmation dialog and click cancel
    await waitFor(() => {
      const cancelButton = getByRole('button', { name: 'Cancel' });
      act(() => {
        fireEvent.click(cancelButton);
      });
    });

    // Dialog should be closed
    expect(queryByText('Confirm Remove Liquidity')).toBeFalsy();

    // Transaction should not be executed
    expect(mockAmmContract.removeLiquidity).not.toHaveBeenCalled();
    expect(mockOnLiquidityComplete).not.toHaveBeenCalled();
  });

  it('should show loading state during operations', async () => {
    // Test loading state during dialog fetch
    const { promise: dialogPromise, resolve: resolveDialog } =
      createDeferredPromise<[bigint, bigint]>();
    mockAmmContract.getRemoveLiquidityOutput.mockReturnValue(dialogPromise);

    const { getByRole, getByPlaceholderText } = render(
      <RemoveLiquidity {...defaultProps} />
    );

    const lpInput = getByPlaceholderText('LP Tokens to Remove');
    const removeButton = getByRole('button', { name: 'Remove Liquidity' });

    // Click remove liquidity button to trigger dialog fetch
    act(() => {
      fireEvent.change(lpInput, { target: { value: '2.5' } });
      fireEvent.click(removeButton);
    });

    // Should show loading state while fetching dialog data
    await waitFor(() => {
      expect(getByRole('button', { name: 'Waiting...' })).toBeTruthy();
    });

    // Resolve dialog fetch and set up transaction loading test
    act(() => {
      resolveDialog([BigInt(5e18), BigInt(2.5e18)]);
    });

    // Wait for dialog to appear after promise resolution
    await waitFor(() => {
      expect(getByRole('button', { name: 'Remove' })).toBeTruthy();
    });

    // Now test loading state during transaction execution
    const { promise: txPromise, resolve: resolveTx } =
      createDeferredTransactionPromise();
    mockAmmContract.removeLiquidity.mockReturnValue(txPromise);

    // Wait for dialog and click confirm
    await waitFor(() => {
      const confirmButton = getByRole('button', { name: 'Remove' });
      act(() => {
        fireEvent.click(confirmButton);
      });
    });

    // Should show loading state during transaction
    await waitFor(() => {
      expect(getByRole('button', { name: 'Waiting...' })).toBeTruthy();
    });

    // Clean up
    act(() => {
      resolveTx();
    });

    // Wait for transaction to complete and state to settle
    await waitFor(() => {
      expect(getByRole('button', { name: 'Remove Liquidity' })).toBeTruthy();
    });
  });

  it('should handle dialog fetch errors', async () => {
    mockAmmContract.getRemoveLiquidityOutput.mockRejectedValue(
      new Error('Failed to fetch output')
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
        'Remove liquidity failed: Failed to fetch output'
      );
    });
  });

  it('should handle transaction errors', async () => {
    mockAmmContract.getRemoveLiquidityOutput.mockResolvedValue([
      BigInt(5e18), // 5 SIMP
      BigInt(2.5e18), // 2.5 ETH
    ]);
    mockAmmContract.removeLiquidity.mockRejectedValue(
      new Error('Transaction failed')
    );

    const { getByRole, getByPlaceholderText } = render(
      <RemoveLiquidity {...defaultProps} />
    );

    const lpInput = getByPlaceholderText('LP Tokens to Remove');
    const removeButton = getByRole('button', { name: 'Remove Liquidity' });

    // Click remove liquidity button
    act(() => {
      fireEvent.change(lpInput, { target: { value: '2.5' } });
      fireEvent.click(removeButton);
    });

    // Wait for confirmation dialog and click confirm
    await waitFor(() => {
      const confirmButton = getByRole('button', { name: 'Remove' });
      act(() => {
        fireEvent.click(confirmButton);
      });
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
