import styles from './WalletInfo.module.scss';

interface WalletInfoProps {
  account: string;
}

export const WalletInfo = ({ account }: WalletInfoProps) => {
  return (
    <div className={styles.walletInfo}>
      <p>
        <strong>Connected Account:</strong> {account || 'Not Connected'}
      </p>
    </div>
  );
};

export default WalletInfo;
