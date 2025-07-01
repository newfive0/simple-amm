import { useWallet, useErrorMessage } from '../../contexts';
import { ConnectWallet } from '../ConnectWallet';
import styles from './Header.module.scss';

export const Header = () => {
  const { account } = useWallet();
  const { errorMessage } = useErrorMessage();

  return (
    <div className={styles.header}>
      <h1 className={styles.title}>Very Simple AMM</h1>
      {errorMessage && (
        <div className={styles.error} data-testid="error-message">
          {errorMessage}
        </div>
      )}
      {!account && !errorMessage && <ConnectWallet />}
    </div>
  );
};

export default Header;
