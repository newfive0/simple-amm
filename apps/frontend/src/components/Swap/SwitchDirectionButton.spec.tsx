import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import { SwitchDirectionButton } from './SwitchDirectionButton';

describe('SwitchDirectionButton', () => {
  it('should render button with correct text', () => {
    const mockOnClick = vi.fn();
    render(<SwitchDirectionButton onClick={mockOnClick} />);

    expect(
      screen.getByRole('button', { name: 'Switch Direction' })
    ).toBeInTheDocument();
  });

  it('should call onClick when clicked', () => {
    const mockOnClick = vi.fn();
    render(<SwitchDirectionButton onClick={mockOnClick} />);

    const button = screen.getByRole('button', { name: 'Switch Direction' });
    fireEvent.click(button);

    expect(mockOnClick).toHaveBeenCalledOnce();
  });

  it('should be disabled when disabled prop is true', () => {
    const mockOnClick = vi.fn();
    render(<SwitchDirectionButton onClick={mockOnClick} disabled={true} />);

    const button = screen.getByRole('button', { name: 'Switch Direction' });
    expect(button).toBeDisabled();

    fireEvent.click(button);
    expect(mockOnClick).not.toHaveBeenCalled();
  });
});
