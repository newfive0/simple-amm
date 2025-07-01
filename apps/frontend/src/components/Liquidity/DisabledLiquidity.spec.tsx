import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { DisabledLiquidity } from './DisabledLiquidity';

const mockSetErrorMessage = vi.fn();
vi.mock('../../contexts/ErrorMessageContext', () => ({
  useErrorMessage: () => ({
    setErrorMessage: mockSetErrorMessage,
  }),
}));

describe('DisabledLiquidity Component', () => {
  beforeEach(() => {
    mockSetErrorMessage.mockClear();
  });

  it('should render with default token symbol', () => {
    render(<DisabledLiquidity />);

    expect(screen.getByText('Liquidity')).toBeInTheDocument();
    expect(screen.getByText('0.0000 SIMP / 0.0000 ETH')).toBeInTheDocument();
  });

  it('should render with SIMP token symbol', () => {
    render(<DisabledLiquidity />);

    expect(screen.getByText('0.0000 SIMP / 0.0000 ETH')).toBeInTheDocument();
  });

  it('should show Add tab by default', () => {
    render(<DisabledLiquidity />);

    expect(screen.getByPlaceholderText('Enter ETH amount')).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText('Enter SIMP amount')
    ).toBeInTheDocument();
  });

  it('should have disabled tabs that do not respond to clicks', () => {
    render(<DisabledLiquidity />);

    const addButton = screen.getByRole('button', { name: 'Add' });
    const removeButton = screen.getByRole('button', { name: 'Remove' });

    expect(addButton).toBeDisabled();
    expect(removeButton).toBeDisabled();

    // Should always show Add tab interface (default state)
    expect(screen.getByPlaceholderText('Enter ETH amount')).toBeInTheDocument();
  });

  it('should show LP token information', () => {
    render(<DisabledLiquidity />);

    expect(screen.getByText('Your LP Tokens:')).toBeInTheDocument();
    expect(screen.getByText('0.0000 ~ 0.00% of pool')).toBeInTheDocument();
  });
});
