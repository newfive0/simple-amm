import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import { SwapHeader } from './SwapHeader';

describe('SwapHeader', () => {
  const mockOnDirectionChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render title and switch button', () => {
    render(
      <SwapHeader
        swapDirection="token-to-eth"
        onDirectionChange={mockOnDirectionChange}
      />
    );

    expect(screen.getByText('Swap')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Switch Direction' })
    ).toBeInTheDocument();
  });

  it('should switch from token-to-eth to eth-to-token', () => {
    render(
      <SwapHeader
        swapDirection="token-to-eth"
        onDirectionChange={mockOnDirectionChange}
      />
    );

    const switchButton = screen.getByRole('button', {
      name: 'Switch Direction',
    });
    fireEvent.click(switchButton);

    expect(mockOnDirectionChange).toHaveBeenCalledWith('eth-to-token');
  });

  it('should switch from eth-to-token to token-to-eth', () => {
    render(
      <SwapHeader
        swapDirection="eth-to-token"
        onDirectionChange={mockOnDirectionChange}
      />
    );

    const switchButton = screen.getByRole('button', {
      name: 'Switch Direction',
    });
    fireEvent.click(switchButton);

    expect(mockOnDirectionChange).toHaveBeenCalledWith('token-to-eth');
  });
});
