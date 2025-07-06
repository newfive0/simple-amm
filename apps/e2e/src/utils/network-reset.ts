import { reset } from '@nomicfoundation/hardhat-network-helpers';
import * as fs from 'fs';
import * as path from 'path';

interface DeploymentConfig {
  contractAddresses: {
    token: string;
    ammPool: string;
  };
  deployment: {
    blockNumber: number;
    chainId: number;
  };
  generatedAt: string;
}

function getDeploymentBlockNumber(): number {
  const configPath = path.join(__dirname, '..', 'config', 'deployment.json');
  const configData = fs.readFileSync(configPath, 'utf8');
  const config: DeploymentConfig = JSON.parse(configData);
  return config.deployment.blockNumber;
}

export async function resetToCleanState(): Promise<void> {
  const blockNumber = getDeploymentBlockNumber();
  await reset('http://localhost:8545', blockNumber);
}
