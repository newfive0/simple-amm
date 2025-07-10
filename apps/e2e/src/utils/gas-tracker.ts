/**
 * Gas tracking utilities for Playwright tests using actual transaction receipts
 */

import { ethers } from 'ethers';

/**
 * Get total gas cost from recent transactions (simplified for local env)
 * @param count Number of recent blocks to check (assumes 1 tx per block)
 * @returns Total gas cost in WEI
 */
export async function getGasCostsFromRecentTransactions(
  count: number
): Promise<bigint> {
  const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');

  const latestBlock = await provider.getBlockNumber();
  let totalGasCostWei = 0n;

  // Get gas costs from the last 'count' blocks (each block has 1 transaction)
  for (let i = 0; i < count; i++) {
    const blockNumber = latestBlock - i;
    if (blockNumber < 0) break;

    const block = await provider.getBlock(blockNumber);
    if (!block || !block.transactions.length) continue;

    // Get the only transaction in the block
    const txHash = block.transactions[0];
    const txResponse = await provider.getTransaction(txHash);
    if (!txResponse) continue;

    // Get the transaction receipt
    const receipt = await provider.getTransactionReceipt(txHash);
    if (!receipt) continue;

    // Calculate gas cost: gasUsed * gasPrice
    const gasCostWei = receipt.gasUsed * (txResponse.gasPrice || 0n);
    totalGasCostWei += gasCostWei;
  }

  return totalGasCostWei;
}
