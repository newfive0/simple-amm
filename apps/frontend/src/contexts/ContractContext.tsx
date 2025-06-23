import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useWallet } from './WalletContext';
import { Token__factory, AMMPool__factory, Token, AMMPool } from '../typechain-types';

interface ContractAddresses {
  tokenAddress: string;
  ammPoolAddress: string;
}

interface ContractContextType {
  tokenContract: Token | null;
  ammContract: AMMPool | null;
  contractAddresses: ContractAddresses | null;
  tokenName: string;
  tokenSymbol: string;
  contractsReady: boolean;
}

interface ReadyContractContextType {
  tokenContract: Token;
  ammContract: AMMPool;
  contractAddresses: ContractAddresses;
  tokenName: string;
  tokenSymbol: string;
  contractsReady: true;
}

const ContractContext = createContext<ContractContextType | undefined>(undefined);

// Function to read contract addresses from deployment artifacts
const getContractAddresses = async (): Promise<ContractAddresses> => {
  const response = await fetch('/deployed_addresses.json');
  const data = await response.json();
  return {
    tokenAddress: data['TokenModule#SimplestToken'],
    ammPoolAddress: data['AMMPoolModule#AMMPool'],
  };
};


export const ContractProvider = ({ children }: { children: ReactNode }) => {
  const { provider, account } = useWallet();
  
  const [tokenContract, setTokenContract] = useState<Token | null>(null);
  const [ammContract, setAmmContract] = useState<AMMPool | null>(null);
  const [contractAddresses, setContractAddresses] = useState<ContractAddresses | null>(null);
  const [tokenName, setTokenName] = useState<string>('');
  const [tokenSymbol, setTokenSymbol] = useState<string>('');

  // Load contract addresses on mount
  useEffect(() => {
    const loadContracts = async () => {
      try {
        const addresses = await getContractAddresses();
        setContractAddresses(addresses);
      } catch {
        // Silently handle error - contracts will remain null
      }
    };

    loadContracts();
  }, []);

  // Initialize contracts when provider and addresses are available
  useEffect(() => {
    const initializeContracts = async () => {
      if (!provider || !account || !contractAddresses) {
        setTokenContract(null);
        setAmmContract(null);
        setTokenName('');
        setTokenSymbol('');
        return;
      }

      try {
        const signer = await provider.getSigner();
        
        const tokenContractInstance = Token__factory.connect(
          contractAddresses.tokenAddress,
          signer,
        );
        
        const ammContractInstance = AMMPool__factory.connect(
          contractAddresses.ammPoolAddress,
          signer,
        );

        setTokenContract(tokenContractInstance);
        setAmmContract(ammContractInstance);

        // Get token details
        const [name, symbol] = await Promise.all([
          tokenContractInstance.name(),
          tokenContractInstance.symbol(),
        ]);
        
        setTokenName(name);
        setTokenSymbol(symbol);
      } catch {
        setTokenContract(null);
        setAmmContract(null);
        setTokenName('');
        setTokenSymbol('');
      }
    };

    initializeContracts();
  }, [provider, account, contractAddresses]);

  const contractsReady = !!(tokenContract && ammContract && contractAddresses);

  const value: ContractContextType = {
    tokenContract,
    ammContract,
    contractAddresses,
    tokenName,
    tokenSymbol,
    contractsReady,
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

export const useReadyContracts = (): ReadyContractContextType => {
  const context = useContracts();
  if (!context.contractsReady) {
    throw new Error('Contracts are not ready. Check contractsReady before calling useReadyContracts');
  }
  return context as ReadyContractContextType;
};