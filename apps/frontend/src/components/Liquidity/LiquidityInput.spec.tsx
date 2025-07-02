import { render, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { LiquidityInput } from './LiquidityInput';

const mockSetErrorMessage = vi.fn();

vi.mock('../../contexts/ErrorMessageContext', () => ({
  useErrorMessage: () => ({
    setErrorMessage: mockSetErrorMessage,
  }),
}));

describe('LiquidityInput', () => {
  const defaultProps = {
    value: 0,
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
      <LiquidityInput {...defaultProps} value={10.5} />
    );

    expect(getByDisplayValue('10.5')).toBeTruthy();
  });

  it('should show empty string when value is 0', () => {
    const { getByPlaceholderText } = render(
      <LiquidityInput {...defaultProps} value={0} />
    );

    const input = getByPlaceholderText('Test placeholder');
    expect(input).toHaveValue(null);
  });

  it('should call onChange with numeric value', () => {
    const mockOnChange = vi.fn();
    const { getByPlaceholderText } = render(
      <LiquidityInput {...defaultProps} onChange={mockOnChange} />
    );

    const input = getByPlaceholderText('Test placeholder');
    fireEvent.input(input, { target: { value: '123.45' } });

    expect(mockOnChange).toHaveBeenCalledWith(123.45);
  });

  it('should handle empty input', () => {
    const mockOnChange = vi.fn();
    const { getByPlaceholderText } = render(
      <LiquidityInput {...defaultProps} onChange={mockOnChange} value={5} />
    );

    const input = getByPlaceholderText('Test placeholder') as HTMLInputElement;
    fireEvent.input(input, { target: { value: '' } });

    expect(mockOnChange).toHaveBeenCalledWith(0);
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
