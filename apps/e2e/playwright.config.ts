import { defineConfig } from '@playwright/test';
import * as dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

export default defineConfig({
  testDir: './src',
  timeout: 120000, // 2 minutes for wallet interactions
  fullyParallel: false, // MetaMask tests should run sequentially

  // Always generate HTML report
  reporter: [['html', { open: 'never' }]],

  use: {
    baseURL: 'http://localhost:4300',
    actionTimeout: 30000,
    // Run headless in CI environment, but MetaMask tests need headed mode
    headless: !!process.env.CI,
    // Set consistent viewport to avoid scrollbar differences
    viewport: { width: 1280, height: 720 },
  },

  // Custom snapshot path
  snapshotPathTemplate:
    '{testDir}/{testFileDir}/{testFileName}-snapshots/{arg}{ext}',

  webServer: {
    command: 'pnpm exec nx preview @simple-amm/frontend',
    url: 'http://localhost:4300',
    reuseExistingServer: !process.env.CI,
    cwd: '../..',
  },

  projects: [
    {
      name: 'synpress-tests',
      testDir: './src',
      testMatch: ['**/*.spec.ts'],
    },
  ],
});
