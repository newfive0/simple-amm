import styles from './WalletInfo.module.scss';

interface WalletInfoProps {
  account: string;
  ethBalance: number;
  tokenBalance: number;
  tokenSymbol: string;
  isCheckingConnection: boolean;
}

export const WalletInfo = ({
  account,
  ethBalance,
  tokenBalance,
  tokenSymbol,
  isCheckingConnection,
}: WalletInfoProps) => {
  if (isCheckingConnection) {
    return (
      <div className={styles.walletInfo}>
        <p>Checking wallet connection...</p>
      </div>
    );
  }

  return (
    <div className={styles.walletInfo}>
      <p>
        <strong>Connected Account:</strong> {account || 'not connected'}
      </p>
      <p>
        <strong>Balance:</strong> {account ? `${tokenBalance.toFixed(4)} ${tokenSymbol} / ${ethBalance.toFixed(4)} ETH` : 'not connected'}
      </p>
    </div>
  );
};

export default WalletInfo;
