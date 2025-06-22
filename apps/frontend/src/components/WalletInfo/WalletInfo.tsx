import styles from './WalletInfo.module.scss';

interface WalletInfoProps {
  account: string;
  ethBalance: string;
  tokenBalance: string;
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
        <strong>Connected Account:</strong> {account}
      </p>
      <p>
        <strong>Balance:</strong> {parseFloat(tokenBalance).toFixed(4)} {tokenSymbol} / {parseFloat(ethBalance).toFixed(4)} ETH
      </p>
    </div>
  );
};

export default WalletInfo;
