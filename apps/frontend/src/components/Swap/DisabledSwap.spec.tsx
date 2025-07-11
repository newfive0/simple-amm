import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { DisabledSwap } from './DisabledSwap';
import { ErrorMessageProvider } from '../../contexts/ErrorMessageContext';

describe('DisabledSwap Component', () => {
  it('should render with both input fields', () => {
    render(
      <ErrorMessageProvider>
        <DisabledSwap />
      </ErrorMessageProvider>
    );

    expect(screen.getByText('Swap')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Sell ETH')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Buy SIMP')).toBeInTheDocument();
  });

  it('should show disabled inputs and button', () => {
    render(
      <ErrorMessageProvider>
        <DisabledSwap />
      </ErrorMessageProvider>
    );

    expect(screen.getByPlaceholderText('Sell ETH')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Buy SIMP')).toBeInTheDocument();
    expect(screen.getByText('Please connect wallet')).toBeInTheDocument();
  });

  it('should have disabled switch direction button', () => {
    render(
      <ErrorMessageProvider>
        <DisabledSwap />
      </ErrorMessageProvider>
    );

    const switchButton = screen.getByRole('button', {
      name: 'Switch Direction',
    });

    expect(switchButton).toBeDisabled();
  });

  it('should have disabled inputs and button', () => {
    render(
      <ErrorMessageProvider>
        <DisabledSwap />
      </ErrorMessageProvider>
    );

    const ethInput = screen.getByPlaceholderText('Sell ETH');
    const simpInput = screen.getByPlaceholderText('Buy SIMP');
    const button = screen.getByRole('button', {
      name: 'Please connect wallet',
    });

    expect(ethInput).toBeDisabled();
    expect(simpInput).toBeDisabled();
    expect(button).toBeDisabled();
  });

  it('should render consistently without props', () => {
    render(
      <ErrorMessageProvider>
        <DisabledSwap />
      </ErrorMessageProvider>
    );

    // Should render both inputs consistently
    expect(screen.getByPlaceholderText('Sell ETH')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Buy SIMP')).toBeInTheDocument();
    expect(screen.getByText('Please connect wallet')).toBeInTheDocument();
  });
});
