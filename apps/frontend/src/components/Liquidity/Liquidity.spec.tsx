import { render, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { Liquidity } from './Liquidity';
import {
  createDeferredTransactionPromise,
  createMockContracts,
  mockContractAddresses,
} from '../../test-mocks';

// Create mock contracts
const { mockTokenContract, mockAmmContract, tokenContract, ammContract } =
  createMockContracts();

const mockOnLiquidityComplete = vi.fn();

const defaultProps = {
  ammContract,
  tokenContract,
  contractAddresses: mockContractAddresses,
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

describe('Liquidity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTokenContract.approve.mockResolvedValue({
      wait: vi.fn().mockResolvedValue({}),
    });
    mockAmmContract.addLiquidity.mockResolvedValue({
      wait: vi.fn().mockResolvedValue({}),
    });
  });

  it('should render successfully', () => {
    const { baseElement } = render(<Liquidity {...defaultProps} />);
    expect(baseElement).toBeTruthy();
  });

  it('should display the correct title and pool reserves', () => {
    const { getByRole, getByText } = render(<Liquidity {...defaultProps} />);
    expect(getByRole('heading', { name: 'Add Liquidity' })).toBeTruthy();
    expect(getByText(/Pool Reserves:/)).toBeTruthy();
    expect(getByText(/20\.0000.*SIMP.*10\.0000.*ETH/)).toBeTruthy();
  });

  it('should render input fields with correct labels', () => {
    const { getByText, getByPlaceholderText } = render(
      <Liquidity {...defaultProps} />
    );
    expect(getByText('ETH Amount')).toBeTruthy();
    expect(getByText('SIMP Amount')).toBeTruthy();
    expect(getByPlaceholderText('Enter ETH amount')).toBeTruthy();
    expect(getByPlaceholderText('Enter SIMP amount')).toBeTruthy();
  });

  it('should calculate corresponding token amount when ETH amount changes', () => {
    const { getByPlaceholderText } = render(<Liquidity {...defaultProps} />);
    const ethInput = getByPlaceholderText('Enter ETH amount');
    const tokenInput = getByPlaceholderText('Enter SIMP amount');

    // AMM auto-calculation: when user enters ETH amount, calculate required token amount
    // to maintain the current pool ratio (constant product formula)
    fireEvent.change(ethInput, { target: { value: '5' } });

    // Pool ratio: 20 SIMP / 10 ETH = 2:1
    // Required tokens: 5 ETH * (20 tokens / 10 ETH) = 10 tokens
    expect(tokenInput).toHaveValue(10);
  });

  it('should calculate corresponding ETH amount when token amount changes', () => {
    const { getByPlaceholderText } = render(<Liquidity {...defaultProps} />);
    const ethInput = getByPlaceholderText('Enter ETH amount');
    const tokenInput = getByPlaceholderText('Enter SIMP amount');

    // AMM auto-calculation: when user enters token amount, calculate required ETH amount
    // to maintain the current pool ratio (constant product formula)
    fireEvent.change(tokenInput, { target: { value: '10' } });

    // Pool ratio: 10 ETH / 20 SIMP = 1:2
    // Required ETH: 10 tokens * (10 ETH / 20 tokens) = 5 ETH
    expect(ethInput).toHaveValue(5);
  });

  it('should not auto-calculate when pool is empty', () => {
    const emptyPoolProps = {
      ...defaultProps,
      poolEthReserve: 0.0,
      poolTokenReserve: 0.0,
    };
    const { getByPlaceholderText } = render(<Liquidity {...emptyPoolProps} />);
    const ethInput = getByPlaceholderText('Enter ETH amount');
    const tokenInput = getByPlaceholderText('Enter SIMP amount');

    fireEvent.change(ethInput, { target: { value: '5' } });

    // When pool is empty, there's no existing ratio to maintain
    // User must manually set both amounts to establish the initial ratio
    // Token amount should remain empty when pool is empty
    expect(tokenInput).toHaveDisplayValue('');
  });

  it('should handle empty input gracefully', () => {
    const { getByPlaceholderText } = render(<Liquidity {...defaultProps} />);
    const ethInput = getByPlaceholderText('Enter ETH amount');
    const tokenInput = getByPlaceholderText('Enter SIMP amount');

    fireEvent.change(ethInput, { target: { value: '' } });

    expect(ethInput).toHaveDisplayValue('');
    expect(tokenInput).toHaveDisplayValue('');
  });

  it('should disable button when amounts are zero', () => {
    const { getByRole } = render(<Liquidity {...defaultProps} />);
    const button = getByRole('button', { name: 'Add Liquidity' });
    expect(button).toBeDisabled();
  });

  it('should enable button when both amounts are provided', () => {
    const { getByRole, getByPlaceholderText } = render(
      <Liquidity {...defaultProps} />
    );
    const ethInput = getByPlaceholderText('Enter ETH amount');
    const button = getByRole('button', { name: 'Add Liquidity' });

    fireEvent.change(ethInput, { target: { value: '5' } });

    // Button enabled because auto-calculation fills both required amounts
    expect(button).toBeEnabled();
  });

  it('should handle successful liquidity addition', async () => {
    const { getByRole, getByPlaceholderText } = render(
      <Liquidity {...defaultProps} />
    );
    const ethInput = getByPlaceholderText('Enter ETH amount');
    const button = getByRole('button', { name: 'Add Liquidity' });

    // Enter 5 ETH - component auto-calculates 10 SIMP tokens (5 * 20/10 = 10)
    fireEvent.change(ethInput, { target: { value: '5' } });
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockTokenContract.approve).toHaveBeenCalledWith(
        mockContractAddresses.ammPoolAddress,
        BigInt(10 * 1e18) // 10 SIMP tokens in wei
      );
      expect(mockAmmContract.addLiquidity).toHaveBeenCalledWith(
        BigInt(10 * 1e18), // 10 SIMP tokens in wei
        { value: BigInt(5 * 1e18) } // 5 ETH in wei
      );
      expect(mockOnLiquidityComplete).toHaveBeenCalled();
    });

    // Form should be reset
    expect(ethInput).toHaveDisplayValue('');
  });

  it('should show loading state during transaction', async () => {
    const { promise, resolve } = createDeferredTransactionPromise();
    mockTokenContract.approve.mockReturnValue(promise);

    const { getByRole, getByPlaceholderText } = render(
      <Liquidity {...defaultProps} />
    );
    const ethInput = getByPlaceholderText('Enter ETH amount');

    fireEvent.change(ethInput, { target: { value: '5' } });

    const button = getByRole('button', { name: 'Add Liquidity' });
    fireEvent.click(button);

    await waitFor(() => {
      expect(getByRole('button', { name: 'Waiting...' })).toBeTruthy();
    });

    resolve();

    await waitFor(() => {
      expect(getByRole('button', { name: 'Add Liquidity' })).toBeTruthy();
    });
  });

  it('should handle transaction errors', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    mockTokenContract.approve.mockRejectedValue(
      new Error('Transaction failed')
    );

    const { getByRole, getByPlaceholderText } = render(
      <Liquidity {...defaultProps} />
    );
    const ethInput = getByPlaceholderText('Enter ETH amount');

    fireEvent.change(ethInput, { target: { value: '5' } });

    const button = getByRole('button', { name: 'Add Liquidity' });
    fireEvent.click(button);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        'Failed to add liquidity: Transaction failed'
      );
    });

    alertSpy.mockRestore();
  });
});
