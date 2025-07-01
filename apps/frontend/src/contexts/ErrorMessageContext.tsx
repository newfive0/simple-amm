import { createContext, useContext, useState, ReactNode } from 'react';

export interface ErrorMessageContextType {
  errorMessage: string;
  setErrorMessage: (message: string) => void;
}

const ErrorMessageContext = createContext<ErrorMessageContextType | undefined>(
  undefined
);

export const ErrorMessageProvider = ({ children }: { children: ReactNode }) => {
  const [errorMessage, setErrorMessage] = useState('');

  const value: ErrorMessageContextType = {
    errorMessage,
    setErrorMessage,
  };

  return (
    <ErrorMessageContext.Provider value={value}>
      {children}
    </ErrorMessageContext.Provider>
  );
};

export const useErrorMessage = () => {
  const context = useContext(ErrorMessageContext);
  if (context === undefined) {
    throw new Error(
      'useErrorMessage must be used within an ErrorMessageProvider'
    );
  }
  return context;
};
