import { defineWalletSetup } from '@synthetixio/synpress';
import { MetaMask } from '@synthetixio/synpress/playwright';
import type { BrowserContext, Page } from '@playwright/test';

const SEED_PHRASE = 'test test test test test test test test test test test junk';
const PASSWORD = 'Tester@1234';

const basicSetup: ReturnType<typeof defineWalletSetup> = defineWalletSetup(PASSWORD, async (context: BrowserContext, walletPage: Page) => {
  const metamask = new MetaMask(context, walletPage, PASSWORD);
  await metamask.importWallet(SEED_PHRASE);
  
  // Add localhost network for Hardhat
  await metamask.addNetwork({
    name: 'Localhost',
    rpcUrl: 'http://127.0.0.1:8545',
    chainId: 31337,
    symbol: 'ETH',
  });
  
  // Switch to localhost network
  await metamask.switchNetwork('Localhost');
});

export default basicSetup;