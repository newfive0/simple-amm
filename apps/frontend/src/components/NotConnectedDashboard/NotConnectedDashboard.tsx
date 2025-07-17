import { useWallet } from '../../contexts';
import { WalletInfo, DisabledSwap, DisabledLiquidity } from '../';

export const NotConnectedDashboard = () => {
  const { account, addTokenToWallet } = useWallet();

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0',
      }}
    >
      <WalletInfo account={account} addTokenToWallet={addTokenToWallet} />
      <DisabledSwap />
      <DisabledLiquidity />
    </div>
  );
};

export default NotConnectedDashboard;
