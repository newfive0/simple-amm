import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { DisabledAddLiquidity } from './DisabledAddLiquidity';

const mockSetErrorMessage = vi.fn();
vi.mock('../../contexts/ErrorMessageContext', () => ({
  useErrorMessage: () => ({
    setErrorMessage: mockSetErrorMessage,
  }),
}));

describe('DisabledAddLiquidity Component', () => {
  beforeEach(() => {
    mockSetErrorMessage.mockClear();
  });

  it('should render ETH and token input fields', () => {
    render(<DisabledAddLiquidity />);

    expect(screen.getByPlaceholderText('Enter ETH amount')).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText('Enter SIMP amount')
    ).toBeInTheDocument();
  });

  it('should render button with disabled state', () => {
    render(<DisabledAddLiquidity />);

    const button = screen.getByRole('button', {
      name: 'Please connect wallet',
    });
    expect(button).toBeInTheDocument();
    expect(button).toBeDisabled();
  });

  it('should use SIMP token symbol in placeholder', () => {
    render(<DisabledAddLiquidity />);

    expect(
      screen.getByPlaceholderText('Enter SIMP amount')
    ).toBeInTheDocument();
  });

  it('should have all inputs disabled', () => {
    render(<DisabledAddLiquidity />);

    const inputs = screen.getAllByRole('spinbutton');
    inputs.forEach((input) => {
      expect(input).toBeDisabled();
    });
  });
});
