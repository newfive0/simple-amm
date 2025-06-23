import { ReactNode } from 'react';
import { ErrorBoundary as ReactErrorBoundary } from 'react-error-boundary';
import styles from './ErrorBoundary.module.scss';

interface ErrorBoundaryProps {
  children: ReactNode;
}

const ErrorFallback = ({ error }: { error: Error }) => (
  <div className={styles.container}>
    {error.message || 'An unexpected error occurred.'}
  </div>
);

export const ErrorBoundary = ({ children }: ErrorBoundaryProps) => (
  <ReactErrorBoundary FallbackComponent={ErrorFallback}>
    {children}
  </ReactErrorBoundary>
);

export default ErrorBoundary;