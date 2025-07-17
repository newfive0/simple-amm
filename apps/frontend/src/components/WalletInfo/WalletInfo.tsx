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
        <p>
          <strong>SIMP Token Address:</strong> {tokenAddress}
          <a
            href="#"
            className={styles.addTokenLink}
            onClick={handleAddToken}
            title="Add SIMP token to MetaMask"
          >
            Add to Wallet
          </a>
        </p>
      )}
    </div>
  );
};

export default WalletInfo;
