import { render, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { Liquidity, DisabledLiquidity } from './Liquidity';
import { createMockContracts, mockContractAddresses } from '../../test-mocks';

// Create mock contracts
const { tokenContract, ammContract } = createMockContracts();

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
    fireEvent.click(removeTab);

    expect(getByPlaceholderText('LP Tokens to Remove')).toBeTruthy();
    expect(getByRole('button', { name: 'Remove Liquidity' })).toBeTruthy();
  });

  it('should maintain tab state', () => {
    const { getByRole, getByPlaceholderText } = render(
      <Liquidity {...defaultProps} />
    );

    // Switch to remove
    fireEvent.click(getByRole('button', { name: 'Remove' }));
    expect(getByPlaceholderText('LP Tokens to Remove')).toBeTruthy();

    // Switch back to add
    fireEvent.click(getByRole('button', { name: 'Add' }));
    expect(getByPlaceholderText('Enter ETH amount')).toBeTruthy();
  });
});

describe('DisabledLiquidity', () => {
  it('should render with disabled state', () => {
    const { getByRole, getByText, getAllByText } = render(
      <DisabledLiquidity />
    );

    expect(getByRole('heading', { name: 'Liquidity' })).toBeTruthy();
    expect(getByText(/Pool Reserves:/)).toBeTruthy();
    expect(getByText(/0\.0000 SIMP.*0\.0000 ETH/)).toBeTruthy();

    // Tabs should be disabled
    const addButton = getByRole('button', { name: 'Add' });
    const removeButton = getByRole('button', { name: 'Remove' });
    expect(addButton).toBeDisabled();
    expect(removeButton).toBeDisabled();

    // Button should show disabled message
    expect(getAllByText('Please connect wallet')[0]).toBeTruthy();
  });

  it('should have disabled input fields', () => {
    const { getByPlaceholderText } = render(<DisabledLiquidity />);

    const ethInput = getByPlaceholderText('Enter ETH amount');
    const simpInput = getByPlaceholderText('Enter SIMP amount');

    expect(ethInput).toBeDisabled();
    expect(simpInput).toBeDisabled();
  });
});
