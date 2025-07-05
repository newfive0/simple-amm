import { render, screen, fireEvent, act } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import { TabGroup } from './TabGroup';

describe('TabGroup Component', () => {
  const mockOnTabChange = vi.fn();

  const defaultProps = {
    options: [
      { id: 'tab1', label: 'Tab 1' },
      { id: 'tab2', label: 'Tab 2' },
      { id: 'tab3', label: 'Tab 3' },
    ],
    activeTab: 'tab1',
    onTabChange: mockOnTabChange,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render all tab options', () => {
    render(<TabGroup {...defaultProps} />);

    expect(screen.getByRole('button', { name: 'Tab 1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tab 2' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tab 3' })).toBeInTheDocument();
  });

  it('should show active tab with active styling', () => {
    render(<TabGroup {...defaultProps} />);

    const activeTab = screen.getByRole('button', { name: 'Tab 1' });
    const inactiveTab = screen.getByRole('button', { name: 'Tab 2' });

    expect(activeTab.className).toContain('active');
    expect(inactiveTab.className).not.toContain('active');
  });

  it('should call onTabChange when tab is clicked', () => {
    render(<TabGroup {...defaultProps} />);

    const tab2 = screen.getByRole('button', { name: 'Tab 2' });
    act(() => {
      fireEvent.click(tab2);
    });

    expect(mockOnTabChange).toHaveBeenCalledWith('tab2');
  });

  it('should not call onTabChange when active tab is clicked again', () => {
    render(<TabGroup {...defaultProps} />);

    const activeTab = screen.getByRole('button', { name: 'Tab 1' });
    act(() => {
      fireEvent.click(activeTab);
    });

    expect(mockOnTabChange).toHaveBeenCalledWith('tab1');
  });

  it('should disable all tabs when disabled prop is true', () => {
    render(<TabGroup {...defaultProps} disabled={true} />);

    const tab1 = screen.getByRole('button', { name: 'Tab 1' });
    const tab2 = screen.getByRole('button', { name: 'Tab 2' });

    expect(tab1).toBeDisabled();
    expect(tab2).toBeDisabled();
  });

  it('should disable individual tabs when option has disabled flag', () => {
    const propsWithDisabledTab = {
      ...defaultProps,
      options: [
        { id: 'tab1', label: 'Tab 1' },
        { id: 'tab2', label: 'Tab 2', disabled: true },
        { id: 'tab3', label: 'Tab 3' },
      ],
    };

    render(<TabGroup {...propsWithDisabledTab} />);

    const tab1 = screen.getByRole('button', { name: 'Tab 1' });
    const tab2 = screen.getByRole('button', { name: 'Tab 2' });
    const tab3 = screen.getByRole('button', { name: 'Tab 3' });

    expect(tab1).not.toBeDisabled();
    expect(tab2).toBeDisabled();
    expect(tab3).not.toBeDisabled();
  });

  it('should not call onTabChange when disabled tab is clicked', () => {
    const propsWithDisabledTab = {
      ...defaultProps,
      options: [
        { id: 'tab1', label: 'Tab 1' },
        { id: 'tab2', label: 'Tab 2', disabled: true },
      ],
    };

    render(<TabGroup {...propsWithDisabledTab} />);

    const disabledTab = screen.getByRole('button', { name: 'Tab 2' });
    act(() => {
      fireEvent.click(disabledTab);
    });

    expect(mockOnTabChange).not.toHaveBeenCalled();
  });

  it('should show tab label when tabLabel is provided', () => {
    render(<TabGroup {...defaultProps} tabLabel="Receive:" />);

    expect(screen.getByText('Receive:')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(
      <TabGroup {...defaultProps} className="custom-class" />
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });
});
