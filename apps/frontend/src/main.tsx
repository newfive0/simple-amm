import { StrictMode } from 'react';
import * as ReactDOM from 'react-dom/client';
import App from './app/app';
import { WalletProvider, ContractProvider, BalanceProvider, LoadingProvider } from './contexts';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement,
);

root.render(
  <StrictMode>
    <LoadingProvider>
      <WalletProvider>
        <ContractProvider>
          <BalanceProvider>
            <App />
          </BalanceProvider>
        </ContractProvider>
      </WalletProvider>
    </LoadingProvider>
  </StrictMode>,
);
