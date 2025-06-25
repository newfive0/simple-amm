import { useWallet } from '../contexts';
import { ConnectWallet, ConnectedDashboard } from '../components';

export const App = () => {
  const { account } = useWallet();

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Simple AMM</h1>
      
      {!account ? (
        <ConnectWallet />
      ) : (
        <ConnectedDashboard />
      )}
    </div>
  );
};

export default App;