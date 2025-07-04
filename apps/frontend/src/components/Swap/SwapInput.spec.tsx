import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { SwapInput } from './SwapInput';

const mockOnClick = vi.fn();
const mockOnChange = vi.fn();
const mockGenerateExpectedOutput = vi.fn((value: string) =>
  value
    ? `≈ ${(parseFloat(value) * 2).toFixed(6)} ETH`
    : '1 SIMP ≈ 2.000000 ETH'
);

const defaultProps = {
  value: '',
  onChange: mockOnChange,
  placeholder: 'SIMP → ETH',
  onClick: mockOnClick,
  buttonText: 'Swap SIMP for ETH',
  isLoading: false,
  generateExpectedOutput: mockGenerateExpectedOutput,
  disabled: false,
};

describe('SwapInput Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render input field with correct placeholder', () => {
      render(<SwapInput {...defaultProps} />);

      expect(screen.getByPlaceholderText('SIMP → ETH')).toBeInTheDocument();
    });

    it('should render button with correct text', () => {
      render(<SwapInput {...defaultProps} />);

      expect(
        screen.getByRole('button', { name: 'Swap SIMP for ETH' })
      ).toBeInTheDocument();
    });

    it('should show expected output when no value', () => {
      render(<SwapInput {...defaultProps} />);

      expect(screen.getByText('1 SIMP ≈ 2.000000 ETH')).toBeInTheDocument();
    });

    it('should show calculated output when value is provided', () => {
      render(<SwapInput {...defaultProps} value="5" />);

      expect(screen.getByText('≈ 10.000000 ETH')).toBeInTheDocument();
    });
  });

  describe('Input Interaction', () => {
    it('should call onChange when input value changes', () => {
      render(<SwapInput {...defaultProps} />);

      const input = screen.getByPlaceholderText('SIMP → ETH');
      fireEvent.change(input, { target: { value: '2.5' } });

      expect(mockOnChange).toHaveBeenCalledWith('2.5');
    });

    it('should display the provided value', () => {
      render(<SwapInput {...defaultProps} value="1.5" />);

      const input = screen.getByPlaceholderText('SIMP → ETH');
      expect(input).toHaveValue(1.5);
    });
  });

  describe('Button Interaction', () => {
    it('should call onClick when button is clicked', () => {
      render(<SwapInput {...defaultProps} value="1" />);

      const button = screen.getByRole('button', { name: 'Swap SIMP for ETH' });
      fireEvent.click(button);

      expect(mockOnClick).toHaveBeenCalled();
    });

    it('should be disabled when no value is provided', () => {
      render(<SwapInput {...defaultProps} value="" />);

      const button = screen.getByRole('button', { name: 'Swap SIMP for ETH' });
      expect(button).toBeDisabled();
    });

    it('should be enabled when value is provided', () => {
      render(<SwapInput {...defaultProps} value="1" />);

      const button = screen.getByRole('button', { name: 'Swap SIMP for ETH' });
      expect(button).toBeEnabled();
    });
  });

  describe('Loading State', () => {
    it('should show loading text when isLoading is true', () => {
      render(<SwapInput {...defaultProps} value="1" isLoading={true} />);

      expect(
        screen.getByRole('button', { name: 'Waiting...' })
      ).toBeInTheDocument();
    });

    it('should disable button when isLoading is true', () => {
      render(<SwapInput {...defaultProps} value="1" isLoading={true} />);

      const button = screen.getByRole('button', { name: 'Waiting...' });
      expect(button).toBeDisabled();
    });

    it('should not call onClick when button is clicked during loading', () => {
      render(<SwapInput {...defaultProps} value="1" isLoading={true} />);

      const button = screen.getByRole('button', { name: 'Waiting...' });
      fireEvent.click(button);

      expect(mockOnClick).not.toHaveBeenCalled();
    });
  });

  describe('Disabled State', () => {
    it('should disable input when disabled prop is true', () => {
      render(<SwapInput {...defaultProps} disabled={true} />);

      const input = screen.getByPlaceholderText('SIMP → ETH');
      expect(input).toBeDisabled();
    });

    it('should disable button when disabled prop is true', () => {
      render(<SwapInput {...defaultProps} value="1" disabled={true} />);

      const button = screen.getByRole('button', { name: 'Swap SIMP for ETH' });
      expect(button).toBeDisabled();
    });

    it('should not call onChange when input is disabled', () => {
      render(<SwapInput {...defaultProps} disabled={true} />);

      const input = screen.getByPlaceholderText('SIMP → ETH');
      fireEvent.change(input, { target: { value: '2.5' } });

      expect(mockOnChange).not.toHaveBeenCalled();
    });

    it('should not call onClick when button is disabled', () => {
      render(<SwapInput {...defaultProps} value="1" disabled={true} />);

      const button = screen.getByRole('button', { name: 'Swap SIMP for ETH' });
      fireEvent.click(button);

      expect(mockOnClick).not.toHaveBeenCalled();
    });
  });

  describe('Expected Output Generation', () => {
    it('should call generateExpectedOutput with current value', () => {
      render(<SwapInput {...defaultProps} value="3" />);

      expect(mockGenerateExpectedOutput).toHaveBeenCalledWith('3');
    });

    it('should update expected output when value changes', () => {
      const { rerender } = render(<SwapInput {...defaultProps} value="1" />);

      expect(screen.getByText('≈ 2.000000 ETH')).toBeInTheDocument();

      rerender(<SwapInput {...defaultProps} value="5" />);

      expect(screen.getByText('≈ 10.000000 ETH')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper input type for number', () => {
      render(<SwapInput {...defaultProps} />);

      const input = screen.getByPlaceholderText('SIMP → ETH');
      expect(input).toHaveAttribute('type', 'number');
    });

    it('should have proper step attribute for decimal inputs', () => {
      render(<SwapInput {...defaultProps} />);

      const input = screen.getByPlaceholderText('SIMP → ETH');
      expect(input).toHaveAttribute('step', '0.01');
    });
  });
});
