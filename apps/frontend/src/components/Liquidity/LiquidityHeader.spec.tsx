import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { LiquidityHeader } from './LiquidityHeader';

describe('LiquidityHeader Component', () => {
  const mockOnTabChange = vi.fn();

  const defaultProps = {
    activeTab: 'add' as const,
    onTabChange: mockOnTabChange,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render title and tab options', () => {
    render(<LiquidityHeader {...defaultProps} />);

    expect(screen.getByText('Liquidity')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove' })).toBeInTheDocument();
  });

  it('should highlight the active tab', () => {
    render(<LiquidityHeader {...defaultProps} activeTab="add" />);

    const addButton = screen.getByRole('button', { name: 'Add' });
    const removeButton = screen.getByRole('button', { name: 'Remove' });

    // Check that Add button has active class and Remove doesn't
    expect(addButton.className).toContain('active');
    expect(removeButton.className).not.toContain('active');
  });

  it('should call onTabChange when a different tab is clicked', () => {
    render(<LiquidityHeader {...defaultProps} activeTab="add" />);

    const removeButton = screen.getByRole('button', { name: 'Remove' });
    fireEvent.click(removeButton);

    expect(mockOnTabChange).toHaveBeenCalledWith('remove');
  });

  it('should disable tabs when disabled prop is true', () => {
    render(<LiquidityHeader {...defaultProps} disabled={true} />);

    const addButton = screen.getByRole('button', { name: 'Add' });
    const removeButton = screen.getByRole('button', { name: 'Remove' });

    expect(addButton).toBeDisabled();
    expect(removeButton).toBeDisabled();
  });

  it('should not call onTabChange when disabled tab is clicked', () => {
    render(<LiquidityHeader {...defaultProps} disabled={true} />);

    const removeButton = screen.getByRole('button', { name: 'Remove' });
    fireEvent.click(removeButton);

    expect(mockOnTabChange).not.toHaveBeenCalled();
  });
});
