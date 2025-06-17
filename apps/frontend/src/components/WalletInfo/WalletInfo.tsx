import styles from './WalletInfo.module.scss';

interface WalletInfoProps {
  account: string;
  ethBalance: string;
  tokenBalance: string;
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
        <strong>Connected Account:</strong> {account}
      </p>
      <p>
        <strong>Balance:</strong> {parseFloat(tokenBalance).toFixed(4)} {tokenSymbol} / {parseFloat(ethBalance).toFixed(4)} ETH
      </p>
    </div>
  );
};

export default WalletInfo;
