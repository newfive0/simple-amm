import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './src',
  timeout: 120000, // 2 minutes for wallet interactions
  fullyParallel: false, // MetaMask tests should run sequentially
  
  // Always generate HTML report
  reporter: [['html', { open: 'never' }]],
  
  use: {
    baseURL: 'http://localhost:4300',
    actionTimeout: 30000,
    // Run headless in CI environment
    headless: !!process.env.CI,
  },

  expect: {
    toHaveScreenshot: { 
      threshold: 0.2
    }
  },

  // Custom snapshot path
  snapshotPathTemplate: '{testDir}/{testFileDir}/{testFileName}-snapshots/{arg}{ext}',

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