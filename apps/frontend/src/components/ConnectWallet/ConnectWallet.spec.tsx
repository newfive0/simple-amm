import { render, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { ConnectWallet } from './ConnectWallet';

describe('ConnectWallet', () => {
  const mockOnConnect = vi.fn();

  beforeEach(() => {
    mockOnConnect.mockClear();
  });

  it('should render successfully', () => {
    const { baseElement } = render(
      <ConnectWallet onConnect={mockOnConnect} isLoading={false} />
    );
    expect(baseElement).toBeTruthy();
  });

  it('should display the correct message', () => {
    const { getByText } = render(
      <ConnectWallet onConnect={mockOnConnect} isLoading={false} />
    );
    expect(getByText('Connect your wallet to start trading')).toBeTruthy();
  });

  it('should display "Connect Wallet" button when not loading', () => {
    const { getByRole } = render(
      <ConnectWallet onConnect={mockOnConnect} isLoading={false} />
    );
    const button = getByRole('button');
    expect(button).toHaveProperty('textContent', 'Connect Wallet');
    expect(button).toHaveProperty('disabled', false);
  });

  it('should display "Connecting..." button when loading', () => {
    const { getByRole } = render(
      <ConnectWallet onConnect={mockOnConnect} isLoading={true} />
    );
    const button = getByRole('button');
    expect(button).toHaveProperty('textContent', 'Connecting...');
    expect(button).toHaveProperty('disabled', true);
  });

  it('should call onConnect when button is clicked and not loading', () => {
    const { getByRole } = render(
      <ConnectWallet onConnect={mockOnConnect} isLoading={false} />
    );
    const button = getByRole('button');
    
    fireEvent.click(button);
    
    expect(mockOnConnect).toHaveBeenCalledTimes(1);
  });

  it('should not call onConnect when button is clicked while loading', () => {
    const { getByRole } = render(
      <ConnectWallet onConnect={mockOnConnect} isLoading={true} />
    );
    const button = getByRole('button');
    
    fireEvent.click(button);
    
    expect(mockOnConnect).not.toHaveBeenCalled();
  });

  it('should handle async onConnect function', async () => {
    const asyncOnConnect = vi.fn().mockResolvedValue(undefined);
    const { getByRole } = render(
      <ConnectWallet onConnect={asyncOnConnect} isLoading={false} />
    );
    const button = getByRole('button');
    
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(asyncOnConnect).toHaveBeenCalledTimes(1);
    });
  });

  it('should handle async onConnect function that rejects', async () => {
    const asyncOnConnect = vi.fn().mockRejectedValue(new Error('Connection failed'));
    const { getByRole } = render(
      <ConnectWallet onConnect={asyncOnConnect} isLoading={false} />
    );
    const button = getByRole('button');
    
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(asyncOnConnect).toHaveBeenCalledTimes(1);
    });
  });

  it('should render component structure correctly', () => {
    const { getByRole, getByText } = render(
      <ConnectWallet onConnect={mockOnConnect} isLoading={false} />
    );
    
    // Check that elements are present (structure verification)
    expect(getByRole('button')).toBeTruthy();
    expect(getByText('Connect your wallet to start trading')).toBeTruthy();
  });
});