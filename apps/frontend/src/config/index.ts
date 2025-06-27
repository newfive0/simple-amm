// Configuration for the application
// All environment variables are read once at startup and validated

export interface AppConfig {
  contracts: {
    tokenAddress: string;
    ammPoolAddress: string;
  };
}

// Read and validate environment variables once at startup
const createConfig = (): AppConfig => {
  const tokenAddress = import.meta.env.VITE_TOKEN_ADDRESS;
  const ammPoolAddress = import.meta.env.VITE_AMM_POOL_ADDRESS;

  if (!tokenAddress || !ammPoolAddress) {
    throw new Error(
      'Contract addresses not found. Ensure contracts are deployed and environment variables are set. ' +
      'Run: nx copy-artifacts contracts'
    );
  }

  return {
    contracts: {
      tokenAddress,
      ammPoolAddress,
    },
  };
};

// Export the configuration (will throw error if env vars are missing)
export const config = createConfig();