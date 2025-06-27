import { useWallet } from '../../contexts';
import { ConnectWallet } from '../ConnectWallet';
import styles from './Header.module.scss';

export const Header = () => {
  const { account, error } = useWallet();

  return (
    <div className={styles.header}>
      <h1 className={styles.title}>Very Simple AMM</h1>
      {error && (
        <div className={styles.error}>
          {error}
        </div>
      )}
      {!account && <ConnectWallet />}
    </div>
  );
};

export default Header;