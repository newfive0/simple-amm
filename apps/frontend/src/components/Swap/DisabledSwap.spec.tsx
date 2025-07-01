import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { DisabledSwap } from './DisabledSwap';

describe('DisabledSwap Component', () => {
  it('should render with default token symbol', () => {
    render(<DisabledSwap />);

    expect(screen.getByText('Swap')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('SIMP → ETH')).toBeInTheDocument();
  });

  it('should render with SIMP token symbol', () => {
    render(<DisabledSwap />);

    expect(screen.getByPlaceholderText('SIMP → ETH')).toBeInTheDocument();
  });

  it('should show token-to-eth swap by default', () => {
    render(<DisabledSwap />);

    expect(screen.getByPlaceholderText('SIMP → ETH')).toBeInTheDocument();
    expect(screen.getByText('Please connect wallet')).toBeInTheDocument();
  });

  it('should have disabled tabs that switch direction visually', () => {
    render(<DisabledSwap />);

    const ethTab = screen.getByRole('button', { name: 'ETH' });
    const tokenTab = screen.getByRole('button', { name: 'SIMP' });

    expect(ethTab).toBeDisabled();
    expect(tokenTab).toBeDisabled();

    // Tabs are disabled but component should handle internal state for visual consistency
    expect(screen.getByPlaceholderText('SIMP → ETH')).toBeInTheDocument();
  });

  it('should have disabled input and button', () => {
    render(<DisabledSwap />);

    const input = screen.getByPlaceholderText('SIMP → ETH');
    const button = screen.getByRole('button', {
      name: 'Please connect wallet',
    });

    expect(input).toBeDisabled();
    expect(button).toBeDisabled();
  });

  it('should show expected output calculation', () => {
    render(<DisabledSwap poolEthReserve={10} poolTokenReserve={20} />);

    // Should show expected output with specific calculation result
    expect(screen.getByText(/1 SIMP ≈ 0.500000 ETH/)).toBeInTheDocument();
  });
});
