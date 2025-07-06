import { ethers } from 'ethers';

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
  const provider = new ethers.JsonRpcProvider('http://localhost:8545');

  // Reset to specific block using hardhat_reset RPC method
  await provider.send('hardhat_reset', [
    {
      forking: {
        jsonRpcUrl: 'http://localhost:8545',
        blockNumber: blockNumber,
      },
    },
  ]);
}
