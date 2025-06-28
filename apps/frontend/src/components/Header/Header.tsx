import { useWallet } from '../../contexts';
import { ConnectWallet } from '../ConnectWallet';
import styles from './Header.module.scss';

export const Header = () => {
  const { account, errorMessage } = useWallet();

  return (
    <div className={styles.header}>
      <h1 className={styles.title}>Very Simple AMM</h1>
      {errorMessage && <div className={styles.error}>{errorMessage}</div>}
      {!account && !errorMessage && <ConnectWallet />}
    </div>
  );
};

export default Header;
