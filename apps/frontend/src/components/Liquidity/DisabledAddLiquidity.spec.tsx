import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { DisabledAddLiquidity } from './DisabledAddLiquidity';

describe('DisabledAddLiquidity Component', () => {
  it('should render ETH and token input fields', () => {
    render(<DisabledAddLiquidity tokenSymbol="SIMP" />);

    expect(screen.getByPlaceholderText('Enter ETH amount')).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText('Enter SIMP amount')
    ).toBeInTheDocument();
  });

  it('should render button with disabled state', () => {
    render(<DisabledAddLiquidity tokenSymbol="SIMP" />);

    const button = screen.getByRole('button', {
      name: 'Please connect wallet',
    });
    expect(button).toBeInTheDocument();
    expect(button).toBeDisabled();
  });

  it('should use dynamic token symbol in placeholder', () => {
    render(<DisabledAddLiquidity tokenSymbol="TEST" />);

    expect(
      screen.getByPlaceholderText('Enter TEST amount')
    ).toBeInTheDocument();
  });

  it('should have all inputs disabled', () => {
    render(<DisabledAddLiquidity tokenSymbol="SIMP" />);

    const inputs = screen.getAllByRole('spinbutton');
    inputs.forEach((input) => {
      expect(input).toBeDisabled();
    });
  });
});
