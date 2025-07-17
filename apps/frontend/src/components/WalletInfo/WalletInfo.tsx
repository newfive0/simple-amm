import styles from './WalletInfo.module.scss';

interface WalletInfoProps {
  account: string;
  addTokenToWallet: () => Promise<void>;
}

export const WalletInfo = ({ account, addTokenToWallet }: WalletInfoProps) => {
  const tokenAddress = import.meta.env.VITE_TOKEN_ADDRESS;

  const handleAddToken = async () => {
    await addTokenToWallet();
  };

  return (
    <div className={styles.walletInfo}>
      <p>
        <strong>Connected Account:</strong> {account || 'Not Connected'}
      </p>

      {tokenAddress && (
        <div className={styles.tokenInfo}>
          <p>
            <strong>SIMP Token Address:</strong>
            <span className={styles.tokenAddress}>{tokenAddress}</span>
            <a
              href="#"
              className={styles.addTokenLink}
              onClick={handleAddToken}
              title="Add SIMP token to MetaMask"
            >
              Add SIMP to Wallet
            </a>
          </p>
        </div>
      )}
    </div>
  );
};

export default WalletInfo;
