import { createContext, useContext, ReactNode } from 'react';
import { useWallet } from './WalletContext';
import { Token__factory, AMMPool__factory, Token, AMMPool } from '@typechain-types';

interface ContractAddresses {
  tokenAddress: string;
  ammPoolAddress: string;
}

interface ContractContextType {
  tokenContract: Token;
  ammContract: AMMPool;
  contractAddresses: ContractAddresses;
}

const ContractContext = createContext<ContractContextType | undefined>(undefined);

// Function to read contract addresses from environment variables
export const getContractAddresses = (): ContractAddresses => {
  const tokenAddress = import.meta.env.VITE_TOKEN_ADDRESS;
  const ammPoolAddress = import.meta.env.VITE_AMM_POOL_ADDRESS;

  if (!tokenAddress || !ammPoolAddress) {
    throw new Error(
      'Contract addresses not found. Ensure contracts are deployed and environment variables are set. ' +
      'Run: nx copy-artifacts contracts'
    );
  }

  return {
    tokenAddress,
    ammPoolAddress,
  };
};


export const ContractProvider = ({ children }: { children: ReactNode }) => {
  const { signer, account } = useWallet();
  
  if (!signer || !account) {
    throw new Error('Wallet signer and account required for contract initialization.');
  }

  // Initialize contract addresses synchronously
  const contractAddresses = getContractAddresses();
  
  // Initialize contracts with signer for transaction support
  const tokenContract = Token__factory.connect(
    contractAddresses.tokenAddress,
    signer,
  );
  
  const ammContract = AMMPool__factory.connect(
    contractAddresses.ammPoolAddress,
    signer,
  );

  const value: ContractContextType = {
    tokenContract,
    ammContract,
    contractAddresses,
  };

  return <ContractContext.Provider value={value}>{children}</ContractContext.Provider>;
}

export const useContracts = () => {
  const context = useContext(ContractContext);
  if (context === undefined) {
    throw new Error('useContracts must be used within a ContractProvider');
  }
  return context;
};

