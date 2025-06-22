import styles from './ConnectWallet.module.scss';

interface ConnectWalletProps {
  onConnect: () => Promise<void>;
  isLoading: boolean;
}

export const ConnectWallet = ({ onConnect, isLoading }: ConnectWalletProps) => {
  return (
    <div className={styles.container}>
      <p className={styles.message}>Connect your wallet to start trading</p>
      <button 
        className={styles.connectButton}
        onClick={onConnect}
        disabled={isLoading}
      >
        {isLoading ? 'Connecting...' : 'Connect Wallet'}
      </button>
    </div>
  );
};

export default ConnectWallet;