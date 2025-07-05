import { render, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { ethers } from 'ethers';
import { LiquidityInput } from './LiquidityInput';

const mockSetErrorMessage = vi.fn();

vi.mock('../../contexts/ErrorMessageContext', () => ({
  useErrorMessage: () => ({
    setErrorMessage: mockSetErrorMessage,
  }),
}));

describe('LiquidityInput', () => {
  const defaultProps = {
    valueWei: 0n,
    onChange: vi.fn(),
    placeholder: 'Test placeholder',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockSetErrorMessage.mockClear();
  });

  it('should render with placeholder', () => {
    const { getByPlaceholderText } = render(
      <LiquidityInput {...defaultProps} />
    );

    expect(getByPlaceholderText('Test placeholder')).toBeTruthy();
  });

  it('should display value when provided', () => {
    const { getByDisplayValue } = render(
      <LiquidityInput
        {...defaultProps}
        valueWei={ethers.parseUnits('10.5', 18)}
      />
    );

    expect(getByDisplayValue('10.5')).toBeTruthy();
  });

  it('should show empty string when value is 0', () => {
    const { getByPlaceholderText } = render(
      <LiquidityInput {...defaultProps} valueWei={0n} />
    );

    const input = getByPlaceholderText('Test placeholder');
    expect(input).toHaveValue(null);
  });

  it('should call onChange with BigInt wei value', () => {
    const mockOnChange = vi.fn();
    const { getByPlaceholderText } = render(
      <LiquidityInput {...defaultProps} onChange={mockOnChange} />
    );

    const input = getByPlaceholderText('Test placeholder');
    fireEvent.input(input, { target: { value: '123.45' } });

    expect(mockOnChange).toHaveBeenCalledWith(ethers.parseUnits('123.45', 18));
  });

  it('should handle empty input', () => {
    const mockOnChange = vi.fn();
    const { getByPlaceholderText } = render(
      <LiquidityInput
        {...defaultProps}
        onChange={mockOnChange}
        valueWei={ethers.parseUnits('5', 18)}
      />
    );

    const input = getByPlaceholderText('Test placeholder') as HTMLInputElement;
    fireEvent.input(input, { target: { value: '' } });

    expect(mockOnChange).toHaveBeenCalledWith(0n);
  });

  it('should be disabled when disabled prop is true', () => {
    const { getByPlaceholderText } = render(
      <LiquidityInput {...defaultProps} disabled={true} />
    );

    const input = getByPlaceholderText('Test placeholder');
    expect(input).toBeDisabled();
  });

  it('should not call onChange when disabled', () => {
    const mockOnChange = vi.fn();
    const { getByPlaceholderText } = render(
      <LiquidityInput
        {...defaultProps}
        onChange={mockOnChange}
        disabled={true}
      />
    );

    const input = getByPlaceholderText('Test placeholder');
    fireEvent.input(input, { target: { value: '123' } });

    expect(mockOnChange).not.toHaveBeenCalled();
  });
});
