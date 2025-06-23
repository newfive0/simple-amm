import { render } from '@testing-library/react';
import { ErrorBoundary } from './ErrorBoundary';

// Mock component that throws an error
const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error message');
  }
  return <div>No error</div>;
};

describe('ErrorBoundary', () => {

  it('should render children when there is no error', () => {
    const { getByText } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(getByText('No error')).toBeTruthy();
  });

  it('should render error UI when there is an error', () => {
    const { getByText } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(getByText('Test error message')).toBeTruthy();
  });

  it('should show actual error message for MetaMask errors', () => {
    const ThrowMetaMaskError = () => {
      throw new Error('MetaMask not detected. Please install MetaMask.');
    };

    const { getByText } = render(
      <ErrorBoundary>
        <ThrowMetaMaskError />
      </ErrorBoundary>
    );

    expect(getByText('MetaMask not detected. Please install MetaMask.')).toBeTruthy();
  });

  it('should show actual error message for wallet connection errors', () => {
    const ThrowWalletError = () => {
      throw new Error('Failed to connect wallet. Please try again.');
    };

    const { getByText } = render(
      <ErrorBoundary>
        <ThrowWalletError />
      </ErrorBoundary>
    );

    expect(getByText('Failed to connect wallet. Please try again.')).toBeTruthy();
  });
});