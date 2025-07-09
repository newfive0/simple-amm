import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { DisabledSwap } from './DisabledSwap';

describe('DisabledSwap Component', () => {
  it('should render with default token symbol', () => {
    render(<DisabledSwap />);

    expect(screen.getByText('Swap')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Get SIMP')).toBeInTheDocument();
  });

  it('should render with SIMP token symbol', () => {
    render(<DisabledSwap />);

    expect(screen.getByPlaceholderText('Get SIMP')).toBeInTheDocument();
  });

  it('should show token-to-eth swap by default', () => {
    render(<DisabledSwap />);

    expect(screen.getByPlaceholderText('Get SIMP')).toBeInTheDocument();
    expect(screen.getByText('Please connect wallet')).toBeInTheDocument();
  });

  it('should have disabled switch direction button', () => {
    render(<DisabledSwap />);

    const switchButton = screen.getByRole('button', {
      name: 'Switch Direction',
    });

    expect(switchButton).toBeDisabled();

    // Switch button is disabled but component should show default direction
    expect(screen.getByPlaceholderText('Get SIMP')).toBeInTheDocument();
  });

  it('should have disabled input and button', () => {
    render(<DisabledSwap />);

    const input = screen.getByPlaceholderText('Get SIMP');
    const button = screen.getByRole('button', {
      name: 'Please connect wallet',
    });

    expect(input).toBeDisabled();
    expect(button).toBeDisabled();
  });

  it('should show expected output calculation', () => {
    render(
      <DisabledSwap
        poolEthReserve={BigInt(10e18)}
        poolTokenReserve={BigInt(20e18)}
      />
    );

    // Should show expected output with specific calculation result
    expect(screen.getByText(/1 SIMP ≈ 0.5000 ETH/)).toBeInTheDocument();
  });
});
