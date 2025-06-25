import { createContext, useContext, ReactNode } from 'react';
import { useWallet } from './WalletContext';
import { Token__factory, AMMPool__factory, Token, AMMPool } from '../typechain-types';

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

// Function to read contract addresses from deployment artifacts synchronously
const getContractAddresses = (): ContractAddresses => {
  // This will be available since the artifacts are copied to public during build
  const request = new XMLHttpRequest();
  request.open('GET', '/deployed_addresses.json', false); // synchronous
  request.send();
  
  if (request.status !== 200) {
    throw new Error('Failed to load contract addresses. Ensure contracts are deployed.');
  }
  
  const data = JSON.parse(request.responseText);
  return {
    tokenAddress: data['TokenModule#SimplestToken'],
    ammPoolAddress: data['AMMPoolModule#AMMPool'],
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

