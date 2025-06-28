import { useState } from 'react';
import { useWallet } from '../../contexts';
import styles from './ConnectWallet.module.scss';

export const ConnectWallet = () => {
  const { connectWallet } = useWallet();
  const [isLoading, setIsLoading] = useState(false);

  const isResourceUnavailableError = (error: unknown): boolean => {
    return !!(
      error &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === -32002
    );
  };

  const handleConnectWallet = async () => {
    setIsLoading(true);
    try {
      await connectWallet();
    } catch (error: unknown) {
      if (isResourceUnavailableError(error)) {
        alert(
          'Connection error occurred. Your wallet may be processing another request. Please check your wallet.'
        );
      } else {
        alert('Failed to connect wallet. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      className={styles.connectButton}
      onClick={handleConnectWallet}
      disabled={isLoading}
    >
      {isLoading ? 'Connecting...' : 'Connect Wallet'}
    </button>
  );
};

export default ConnectWallet;
