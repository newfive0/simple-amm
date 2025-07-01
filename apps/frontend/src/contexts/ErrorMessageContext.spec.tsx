import { render, screen, act } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import { ErrorMessageProvider, useErrorMessage } from './ErrorMessageContext';

// Create test component to consume context
const TestComponent = () => {
  const { errorMessage, setErrorMessage } = useErrorMessage();

  return (
    <div>
      <div data-testid="error-message">{errorMessage || 'null'}</div>
      <button
        onClick={() => setErrorMessage('Test error message')}
        data-testid="set-error"
      >
        Set Error
      </button>
      <button
        onClick={() => setErrorMessage('Another error')}
        data-testid="set-another-error"
      >
        Set Another Error
      </button>
      <button onClick={() => setErrorMessage('')} data-testid="clear-error">
        Clear Error
      </button>
    </div>
  );
};

describe('ErrorMessageContext', () => {
  describe('Provider Setup', () => {
    it('should throw error when useErrorMessage is used outside provider', () => {
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      expect(() => render(<TestComponent />)).toThrow(
        'useErrorMessage must be used within an ErrorMessageProvider'
      );

      consoleErrorSpy.mockRestore();
    });

    it('should provide initial empty error message', () => {
      render(
        <ErrorMessageProvider>
          <TestComponent />
        </ErrorMessageProvider>
      );

      expect(screen.getByTestId('error-message')).toHaveTextContent('null');
    });
  });

  describe('Error Message Management', () => {
    it('should set error message', () => {
      render(
        <ErrorMessageProvider>
          <TestComponent />
        </ErrorMessageProvider>
      );

      act(() => {
        screen.getByTestId('set-error').click();
      });

      expect(screen.getByTestId('error-message')).toHaveTextContent(
        'Test error message'
      );
    });

    it('should replace existing error message with new one', () => {
      render(
        <ErrorMessageProvider>
          <TestComponent />
        </ErrorMessageProvider>
      );

      // Set first error
      act(() => {
        screen.getByTestId('set-error').click();
      });

      expect(screen.getByTestId('error-message')).toHaveTextContent(
        'Test error message'
      );

      // Set second error (should replace first)
      act(() => {
        screen.getByTestId('set-another-error').click();
      });

      expect(screen.getByTestId('error-message')).toHaveTextContent(
        'Another error'
      );
    });

    it('should clear error message', () => {
      render(
        <ErrorMessageProvider>
          <TestComponent />
        </ErrorMessageProvider>
      );

      // Set error first
      act(() => {
        screen.getByTestId('set-error').click();
      });

      expect(screen.getByTestId('error-message')).toHaveTextContent(
        'Test error message'
      );

      // Clear error
      act(() => {
        screen.getByTestId('clear-error').click();
      });

      expect(screen.getByTestId('error-message')).toHaveTextContent('null');
    });
  });
});
