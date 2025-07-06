import { reset } from '@nomicfoundation/hardhat-network-helpers';

function getDeploymentBlockNumber(): number {
  const blockNumber = process.env.DEPLOYMENT_BLOCK_NUMBER;
  if (!blockNumber) {
    throw new Error(
      'DEPLOYMENT_BLOCK_NUMBER environment variable not set. Run "nx copy-artifacts contracts" first.'
    );
  }
  return parseInt(blockNumber, 10);
}

export async function resetToCleanState(): Promise<void> {
  const blockNumber = getDeploymentBlockNumber();
  await reset('http://localhost:8545', blockNumber);
}
