import { createContext, useContext, useState, ReactNode } from 'react';

interface LoadingContextType {
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  loadingMessage: string;
  setLoadingMessage: (message: string) => void;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export function LoadingProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');

  const value: LoadingContextType = {
    isLoading,
    setIsLoading,
    loadingMessage,
    setLoadingMessage,
  };

  return <LoadingContext.Provider value={value}>{children}</LoadingContext.Provider>;
}

export function useLoading() {
  const context = useContext(LoadingContext);
  if (context === undefined) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
}