import { render, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { LiquidityHeader } from './LiquidityHeader';

describe('LiquidityHeader', () => {
  it('should render with default props', () => {
    const { getByRole, getByText } = render(<LiquidityHeader />);

    expect(getByRole('heading', { name: 'Liquidity' })).toBeTruthy();
    expect(getByText('Add')).toBeTruthy();
    expect(getByText('Remove')).toBeTruthy();
  });

  it('should show add tab as active by default', () => {
    const { getByRole } = render(<LiquidityHeader />);

    const addButton = getByRole('button', { name: 'Add' });
    expect(addButton.className).toContain('active');
  });

  it('should show remove tab as active when activeTab is remove', () => {
    const { getByRole } = render(<LiquidityHeader activeTab="remove" />);

    const removeButton = getByRole('button', { name: 'Remove' });
    expect(removeButton.className).toContain('active');
  });

  it('should call onTabChange when tabs are clicked', () => {
    const mockOnTabChange = vi.fn();
    const { getByRole } = render(
      <LiquidityHeader onTabChange={mockOnTabChange} />
    );

    const removeButton = getByRole('button', { name: 'Remove' });
    fireEvent.click(removeButton);

    expect(mockOnTabChange).toHaveBeenCalledWith('remove');
  });

  it('should disable tabs when disabled prop is true', () => {
    const { getByRole } = render(<LiquidityHeader disabled={true} />);

    const addButton = getByRole('button', { name: 'Add' });
    const removeButton = getByRole('button', { name: 'Remove' });

    expect(addButton).toBeDisabled();
    expect(removeButton).toBeDisabled();
  });
});
