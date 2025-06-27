import { useWallet } from '../../contexts';
import { WalletInfo, DisabledSwap } from '../';

export const NotConnectedDashboard = () => {
  const { account, isCheckingConnection } = useWallet();

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '0',
    }}>
      <WalletInfo
        account={account}
        ethBalance={0}
        tokenBalance={0}
        tokenSymbol=""
        isCheckingConnection={isCheckingConnection}
      />
      <DisabledSwap />
    </div>
  );
};

export default NotConnectedDashboard;