import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ethers } from 'ethers';
import { useWallet } from './WalletContext';

interface ContractAddresses {
  tokenAddress: string;
  ammPoolAddress: string;
}

interface ContractContextType {
  tokenContract: ethers.Contract | null;
  ammContract: ethers.Contract | null;
  contractAddresses: ContractAddresses | null;
  tokenName: string;
  tokenSymbol: string;
  contractsReady: boolean;
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

// Function to load contract artifacts
const loadContractArtifacts = async () => {
  const [tokenResponse, ammPoolResponse] = await Promise.all([
    fetch('/artifacts/Token.json'),
    fetch('/artifacts/AMMPool.json'),
  ]);

  const tokenArtifact = await tokenResponse.json();
  const ammPoolArtifact = await ammPoolResponse.json();

  return {
    tokenAbi: tokenArtifact.abi,
    ammPoolAbi: ammPoolArtifact.abi,
  };
};

export function ContractProvider({ children }: { children: ReactNode }) {
  const { provider, account } = useWallet();
  
  const [tokenContract, setTokenContract] = useState<ethers.Contract | null>(null);
  const [ammContract, setAmmContract] = useState<ethers.Contract | null>(null);
  const [contractAddresses, setContractAddresses] = useState<ContractAddresses | null>(null);
  const [tokenName, setTokenName] = useState<string>('');
  const [tokenSymbol, setTokenSymbol] = useState<string>('');

  // Load contract addresses on mount
  useEffect(() => {
    const loadContracts = async () => {
      try {
        const addresses = await getContractAddresses();
        setContractAddresses(addresses);
      } catch (error) {
        console.error('Failed to load contract addresses:', error);
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
        const artifacts = await loadContractArtifacts();
        
        const tokenContractInstance = new ethers.Contract(
          contractAddresses.tokenAddress,
          artifacts.tokenAbi,
          signer,
        );
        
        const ammContractInstance = new ethers.Contract(
          contractAddresses.ammPoolAddress,
          artifacts.ammPoolAbi,
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
      } catch (error) {
        console.error('Failed to initialize contracts:', error);
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

export function useContracts() {
  const context = useContext(ContractContext);
  if (context === undefined) {
    throw new Error('useContracts must be used within a ContractProvider');
  }
  return context;
}