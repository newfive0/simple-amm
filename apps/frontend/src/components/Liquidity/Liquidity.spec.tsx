import { render, fireEvent, act } from '@testing-library/react';
import { vi } from 'vitest';
import { Liquidity } from './Liquidity';
import { createMockContracts } from '../../test-mocks';

const mockSetErrorMessage = vi.fn();
vi.mock('../../contexts/ErrorMessageContext', () => ({
  useErrorMessage: () => ({
    setErrorMessage: mockSetErrorMessage,
  }),
}));

// Create mock contracts
const { tokenContract, ammContract } = createMockContracts();

const mockOnLiquidityComplete = vi.fn();

const defaultProps = {
  ammContract,
  tokenContract,
  poolEthReserve: BigInt(10e18), // 10 ETH in wei
  poolTokenReserve: BigInt(20e18), // 20 tokens in wei
  lpTokenBalances: {
    userLPTokens: 5.0,
    totalLPTokens: 10.0,
    poolOwnershipPercentage: 50.0,
  },
  onLiquidityComplete: mockOnLiquidityComplete,
};

describe('Liquidity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSetErrorMessage.mockClear();
  });

  it('should render successfully', () => {
    const { baseElement } = render(<Liquidity {...defaultProps} />);
    expect(baseElement).toBeTruthy();
  });

  it('should display the correct title and pool reserves', () => {
    const { getByRole, getByText } = render(<Liquidity {...defaultProps} />);
    expect(getByRole('heading', { name: 'Liquidity' })).toBeTruthy();
    expect(getByText(/Pool Reserves:/)).toBeTruthy();
    expect(getByText(/20\.0000.*SIMP.*10\.0000.*ETH/)).toBeTruthy();
  });

  it('should display LP tokens with correct format', () => {
    const { getByText } = render(<Liquidity {...defaultProps} />);
    expect(getByText(/5\.0000 ~ 50\.00% of pool/)).toBeTruthy();
  });

  it('should display tabs for add and remove', () => {
    const { getByRole } = render(<Liquidity {...defaultProps} />);
    expect(getByRole('button', { name: 'Add' })).toBeTruthy();
    expect(getByRole('button', { name: 'Remove' })).toBeTruthy();
  });

  it('should show add liquidity by default', () => {
    const { getByPlaceholderText } = render(<Liquidity {...defaultProps} />);
    expect(getByPlaceholderText('Enter ETH amount')).toBeTruthy();
    expect(getByPlaceholderText('Enter SIMP amount')).toBeTruthy();
  });

  it('should switch to remove tab when clicked', () => {
    const { getByRole, getByPlaceholderText } = render(
      <Liquidity {...defaultProps} />
    );
    const removeTab = getByRole('button', { name: 'Remove' });
    act(() => {
      fireEvent.click(removeTab);
    });

    expect(getByPlaceholderText('LP Tokens to Remove')).toBeTruthy();
    expect(getByRole('button', { name: 'Remove Liquidity' })).toBeTruthy();
  });

  it('should maintain tab state', () => {
    const { getByRole, getByPlaceholderText } = render(
      <Liquidity {...defaultProps} />
    );

    // Switch to remove
    act(() => {
      fireEvent.click(getByRole('button', { name: 'Remove' }));
    });
    expect(getByPlaceholderText('LP Tokens to Remove')).toBeTruthy();

    // Switch back to add
    act(() => {
      fireEvent.click(getByRole('button', { name: 'Add' }));
    });
    expect(getByPlaceholderText('Enter ETH amount')).toBeTruthy();
  });
});
