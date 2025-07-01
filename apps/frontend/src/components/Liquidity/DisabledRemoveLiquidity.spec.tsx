import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { DisabledRemoveLiquidity } from './DisabledRemoveLiquidity';

describe('DisabledRemoveLiquidity Component', () => {
  it('should render LP token input field', () => {
    render(<DisabledRemoveLiquidity />);

    expect(
      screen.getByPlaceholderText('LP Tokens to Remove')
    ).toBeInTheDocument();
  });

  it('should render button with disabled state', () => {
    render(<DisabledRemoveLiquidity />);

    const button = screen.getByRole('button', {
      name: 'Please connect wallet',
    });
    expect(button).toBeInTheDocument();
    expect(button).toBeDisabled();
  });

  it('should show expected output with token symbol', () => {
    render(<DisabledRemoveLiquidity />);

    expect(screen.getByText('0.0000 SIMP + 0.0000 ETH')).toBeInTheDocument();
  });

  it('should have input disabled', () => {
    render(<DisabledRemoveLiquidity />);

    const input = screen.getByPlaceholderText('LP Tokens to Remove');
    expect(input).toBeDisabled();
  });
});
