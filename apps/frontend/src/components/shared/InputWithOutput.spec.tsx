import { render, fireEvent, act } from '@testing-library/react';
import { vi } from 'vitest';
import { InputWithOutput } from './InputWithOutput';

describe('InputWithOutput', () => {
  const mockOnChange = vi.fn();
  const mockGenerateExpectedOutput = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render input and expected output', () => {
    mockGenerateExpectedOutput.mockReturnValue('≈ 5 ETH');

    const { getByPlaceholderText, getByText } = render(
      <InputWithOutput
        amountWei={BigInt(10e18)}
        onChange={mockOnChange}
        placeholder="Enter amount"
        generateExpectedOutput={mockGenerateExpectedOutput}
      />
    );

    expect(getByPlaceholderText('Enter amount')).toBeTruthy();
    expect(getByText('≈ 5 ETH')).toBeTruthy();
    expect(mockGenerateExpectedOutput).toHaveBeenCalledWith('10.0');
  });

  it('should call onChange when input value changes', () => {
    mockGenerateExpectedOutput.mockReturnValue('0');

    const { getByPlaceholderText } = render(
      <InputWithOutput
        amountWei={0n}
        onChange={mockOnChange}
        placeholder="Enter amount"
        generateExpectedOutput={mockGenerateExpectedOutput}
      />
    );

    const input = getByPlaceholderText('Enter amount');
    act(() => {
      fireEvent.change(input, { target: { value: '25' } });
    });

    expect(mockOnChange).toHaveBeenCalledWith(BigInt(25e18));
  });

  it('should start with empty input value', () => {
    mockGenerateExpectedOutput.mockReturnValue('Result: 84');

    const { getByPlaceholderText } = render(
      <InputWithOutput
        amountWei={BigInt(42e18)}
        onChange={mockOnChange}
        placeholder="Enter amount"
        generateExpectedOutput={mockGenerateExpectedOutput}
      />
    );

    const input = getByPlaceholderText('Enter amount') as HTMLInputElement;
    expect(input.value).toBe('');
  });

  it('should be disabled when disabled prop is true', () => {
    mockGenerateExpectedOutput.mockReturnValue('0');

    const { getByPlaceholderText } = render(
      <InputWithOutput
        amountWei={0n}
        onChange={mockOnChange}
        placeholder="Enter amount"
        generateExpectedOutput={mockGenerateExpectedOutput}
        disabled={true}
      />
    );

    const input = getByPlaceholderText('Enter amount') as HTMLInputElement;
    expect(input.disabled).toBe(true);
  });

  it('should not call onChange when disabled', () => {
    mockGenerateExpectedOutput.mockReturnValue('0');

    const { getByPlaceholderText } = render(
      <InputWithOutput
        amountWei={0n}
        onChange={mockOnChange}
        placeholder="Enter amount"
        generateExpectedOutput={mockGenerateExpectedOutput}
        disabled={true}
      />
    );

    const input = getByPlaceholderText('Enter amount');
    act(() => {
      fireEvent.change(input, { target: { value: '100' } });
    });

    expect(mockOnChange).not.toHaveBeenCalled();
  });

  it('should accept decimal values', () => {
    mockGenerateExpectedOutput.mockReturnValue('π');

    const { getByPlaceholderText } = render(
      <InputWithOutput
        amountWei={BigInt(3.14e18)}
        onChange={mockOnChange}
        placeholder="Enter amount"
        generateExpectedOutput={mockGenerateExpectedOutput}
      />
    );

    const input = getByPlaceholderText('Enter amount') as HTMLInputElement;
    expect(input.value).toBe(''); // Uncontrolled input starts empty
    expect(input.step).toBe('0.01');
  });

  it('should handle empty expected output', () => {
    mockGenerateExpectedOutput.mockReturnValue('');

    const { getByPlaceholderText, container } = render(
      <InputWithOutput
        amountWei={0n}
        onChange={mockOnChange}
        placeholder="Enter amount"
        generateExpectedOutput={mockGenerateExpectedOutput}
      />
    );

    expect(getByPlaceholderText('Enter amount')).toBeTruthy();
    // Check that the second div (output) contains empty text
    const divs = container.querySelectorAll('div');
    expect(divs[1]?.textContent).toBe('');
  });

  it('should have correct structure', () => {
    mockGenerateExpectedOutput.mockReturnValue('Result');

    const { container, getByPlaceholderText } = render(
      <InputWithOutput
        amountWei={0n}
        onChange={mockOnChange}
        placeholder="Enter amount"
        generateExpectedOutput={mockGenerateExpectedOutput}
      />
    );

    // Check that there's a container div with input and output div
    const rootDiv = container.firstElementChild;
    expect(rootDiv?.tagName).toBe('DIV');

    const input = getByPlaceholderText('Enter amount') as HTMLInputElement;
    expect(input.tagName).toBe('INPUT');
    expect(input.type).toBe('number');

    const divs = container.querySelectorAll('div');
    expect(divs.length).toBe(2); // Root div and output div
    expect(divs[1]?.textContent).toBe('Result');
  });

  it('should call generateExpectedOutput with current value', () => {
    mockGenerateExpectedOutput.mockReturnValue('Test Output');

    render(
      <InputWithOutput
        amountWei={BigInt(123e18)}
        onChange={mockOnChange}
        placeholder="Enter amount"
        generateExpectedOutput={mockGenerateExpectedOutput}
      />
    );

    expect(mockGenerateExpectedOutput).toHaveBeenCalledWith('123.0');
  });
});
