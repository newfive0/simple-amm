import { render, fireEvent, waitFor, act } from '@testing-library/react';
import { vi } from 'vitest';
import { ConnectWallet } from './ConnectWallet';
import { createDeferredPromise } from '../../test-mocks';

// Mock the contexts
const mockConnectWallet = vi.fn();

vi.mock('../../contexts', () => ({
  useWallet: () => ({
    connectWallet: mockConnectWallet,
  }),
}));

describe('ConnectWallet', () => {
  beforeEach(() => {
    mockConnectWallet.mockClear();
  });

  it('should render successfully', () => {
    const { baseElement } = render(<ConnectWallet />);
    expect(baseElement).toBeTruthy();
  });

  it('should display the connect button text', () => {
    const { getByText } = render(<ConnectWallet />);
    expect(getByText('Connect Wallet')).toBeTruthy();
  });

  it('should display the connect button', () => {
    const { getByText } = render(<ConnectWallet />);
    const button = getByText('Connect Wallet');
    expect(button).toBeTruthy();
  });

  it('should call connectWallet when button is clicked', async () => {
    const { getByRole } = render(<ConnectWallet />);
    const button = getByRole('button');

    act(() => {
      fireEvent.click(button);
    });

    await waitFor(() => {
      expect(mockConnectWallet).toHaveBeenCalledTimes(1);
    });
  });

  it('should show loading state when connecting', async () => {
    // Mock connectWallet to return a promise that doesn't resolve immediately
    const { promise, resolve } = createDeferredPromise<void>();
    mockConnectWallet.mockReturnValue(promise);

    const { getByRole, getByText } = render(<ConnectWallet />);
    const button = getByRole('button');

    // Click the button to start connecting
    act(() => {
      fireEvent.click(button);
    });

    // Check that the loading state is shown
    await waitFor(() => {
      expect(getByText('Connecting...')).toBeTruthy();
    });

    // Resolve the promise to finish the connection
    act(() => {
      resolve();
    });

    // Wait for the loading state to disappear
    await waitFor(() => {
      expect(getByText('Connect Wallet')).toBeTruthy();
    });
  });
});
