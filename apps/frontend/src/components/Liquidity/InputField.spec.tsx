import { render, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { InputField } from './InputField';

describe('InputField', () => {
  const defaultProps = {
    label: 'Test Label',
    value: 0,
    onChange: vi.fn(),
    placeholder: 'Test placeholder',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render with label and placeholder', () => {
    const { getByText, getByPlaceholderText } = render(
      <InputField {...defaultProps} />
    );

    expect(getByText('Test Label')).toBeTruthy();
    expect(getByPlaceholderText('Test placeholder')).toBeTruthy();
  });

  it('should display value when provided', () => {
    const { getByDisplayValue } = render(
      <InputField {...defaultProps} value={10.5} />
    );

    expect(getByDisplayValue('10.5')).toBeTruthy();
  });

  it('should show empty string when value is 0', () => {
    const { getByPlaceholderText } = render(
      <InputField {...defaultProps} value={0} />
    );

    const input = getByPlaceholderText('Test placeholder');
    expect(input).toHaveValue(null);
  });

  it('should call onChange with numeric value', () => {
    const mockOnChange = vi.fn();
    const { getByPlaceholderText } = render(
      <InputField {...defaultProps} onChange={mockOnChange} />
    );

    const input = getByPlaceholderText('Test placeholder');
    fireEvent.input(input, { target: { value: '123.45' } });

    expect(mockOnChange).toHaveBeenCalledWith(123.45);
  });

  it('should handle empty input', () => {
    const mockOnChange = vi.fn();
    const { getByPlaceholderText } = render(
      <InputField {...defaultProps} onChange={mockOnChange} value={5} />
    );

    const input = getByPlaceholderText('Test placeholder') as HTMLInputElement;
    fireEvent.input(input, { target: { value: '' } });

    expect(mockOnChange).toHaveBeenCalledWith(0);
  });

  it('should be disabled when disabled prop is true', () => {
    const { getByPlaceholderText } = render(
      <InputField {...defaultProps} disabled={true} />
    );

    const input = getByPlaceholderText('Test placeholder');
    expect(input).toBeDisabled();
  });

  it('should not call onChange when disabled', () => {
    const mockOnChange = vi.fn();
    const { getByPlaceholderText } = render(
      <InputField {...defaultProps} onChange={mockOnChange} disabled={true} />
    );

    const input = getByPlaceholderText('Test placeholder');
    fireEvent.input(input, { target: { value: '123' } });

    expect(mockOnChange).not.toHaveBeenCalled();
  });
});
