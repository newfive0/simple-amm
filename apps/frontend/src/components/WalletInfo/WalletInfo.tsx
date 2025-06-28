import styles from './WalletInfo.module.scss';

interface WalletInfoProps {
  account: string;
  ethBalance: number;
  tokenBalance: number;
  tokenSymbol: string;
}

export const WalletInfo = ({
  account,
  ethBalance,
  tokenBalance,
  tokenSymbol,
}: WalletInfoProps) => {
  return (
    <div className={styles.walletInfo}>
      <p>
        <strong>Your Account:</strong> {account || 'Not Connected'}
      </p>
      <p>
        <strong>Balance:</strong>{' '}
        {account
          ? `${tokenBalance.toFixed(4)} ${tokenSymbol} / ${ethBalance.toFixed(4)} ETH`
          : 'N/A'}
      </p>
    </div>
  );
};

export default WalletInfo;
