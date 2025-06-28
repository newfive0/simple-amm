import { useWallet } from '../contexts';
import {
  Header,
  ConnectedDashboard,
  NotConnectedDashboard,
} from '../components';

export const App = () => {
  const { account } = useWallet();

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <Header />

      {!account ? <NotConnectedDashboard /> : <ConnectedDashboard />}
    </div>
  );
};

export default App;
