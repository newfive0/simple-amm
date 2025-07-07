import { render, screen, fireEvent, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ConfirmationDialog } from './ConfirmationDialog';

describe('ConfirmationDialog Component', () => {
  const mockOnConfirm = vi.fn();
  const mockOnCancel = vi.fn();

  const defaultProps = {
    isOpen: true,
    title: 'Test Confirmation',
    onConfirm: mockOnConfirm,
    onCancel: mockOnCancel,
    children: <p>Are you sure you want to proceed?</p>,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render when isOpen is true', () => {
    render(<ConfirmationDialog {...defaultProps} />);

    expect(screen.getByText('Test Confirmation')).toBeInTheDocument();
    expect(
      screen.getByText('Are you sure you want to proceed?')
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });

  it('should not render when isOpen is false', () => {
    render(<ConfirmationDialog {...defaultProps} isOpen={false} />);

    expect(screen.queryByText('Test Confirmation')).not.toBeInTheDocument();
    expect(
      screen.queryByText('Are you sure you want to proceed?')
    ).not.toBeInTheDocument();
  });

  it('should call onConfirm when confirm button is clicked', () => {
    render(<ConfirmationDialog {...defaultProps} />);

    const confirmButton = screen.getByRole('button', { name: 'Confirm' });
    act(() => {
      fireEvent.click(confirmButton);
    });

    expect(mockOnConfirm).toHaveBeenCalledTimes(1);
    expect(mockOnCancel).not.toHaveBeenCalled();
  });

  it('should call onCancel when cancel button is clicked', () => {
    render(<ConfirmationDialog {...defaultProps} />);

    const cancelButton = screen.getByRole('button', { name: 'Cancel' });
    act(() => {
      fireEvent.click(cancelButton);
    });

    expect(mockOnCancel).toHaveBeenCalledTimes(1);
    expect(mockOnConfirm).not.toHaveBeenCalled();
  });

  it('should use custom button text when provided', () => {
    render(
      <ConfirmationDialog
        {...defaultProps}
        confirmText="Proceed"
        cancelText="Go Back"
      />
    );

    expect(screen.getByRole('button', { name: 'Proceed' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Go Back' })).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Confirm' })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Cancel' })
    ).not.toBeInTheDocument();
  });

  it('should render custom children content', () => {
    const customContent = (
      <div>
        <p>Custom message</p>
        <ul>
          <li>Item 1</li>
          <li>Item 2</li>
        </ul>
      </div>
    );

    render(
      <ConfirmationDialog {...defaultProps}>{customContent}</ConfirmationDialog>
    );

    expect(screen.getByText('Custom message')).toBeInTheDocument();
    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('Item 2')).toBeInTheDocument();
  });

  it('should have proper dialog structure', () => {
    const { container } = render(<ConfirmationDialog {...defaultProps} />);

    // Check that dialog structure exists
    const title = screen.getByText('Test Confirmation');
    const content = screen.getByText('Are you sure you want to proceed?');
    const confirmButton = screen.getByRole('button', { name: 'Confirm' });
    const cancelButton = screen.getByRole('button', { name: 'Cancel' });

    expect(title).toBeInTheDocument();
    expect(content).toBeInTheDocument();
    expect(confirmButton).toBeInTheDocument();
    expect(cancelButton).toBeInTheDocument();

    // Check that we have a modal overlay structure
    expect(container.firstChild).toBeInTheDocument();
  });

  it('should show dialog content with proper sections', () => {
    render(<ConfirmationDialog {...defaultProps} />);

    // Check header section
    expect(screen.getByText('Test Confirmation')).toBeInTheDocument();

    // Check content section
    expect(
      screen.getByText('Are you sure you want to proceed?')
    ).toBeInTheDocument();

    // Check actions section
    const confirmButton = screen.getByRole('button', { name: 'Confirm' });
    const cancelButton = screen.getByRole('button', { name: 'Cancel' });

    expect(confirmButton).toBeInTheDocument();
    expect(cancelButton).toBeInTheDocument();
  });
});
