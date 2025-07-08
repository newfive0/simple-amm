import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './src',
  timeout: 120000, // 2 minutes for wallet interactions
  fullyParallel: false, // MetaMask tests should run sequentially
  globalSetup: './global-setup.ts',

  // Always generate HTML report
  reporter: [['html', { open: 'never' }]],

  use: {
    baseURL: 'http://localhost:4200',
    actionTimeout: 30000,
    // Run headless in CI environment, but MetaMask tests need headed mode
    headless: !!process.env.CI,
    // Set consistent viewport to avoid scrollbar differences
    viewport: { width: 1280, height: 720 },
  },

  // Custom snapshot path
  snapshotPathTemplate:
    '{testDir}/{testFileDir}/{testFileName}-snapshots/{arg}{ext}',

  // No webServer - expect frontend to be running on port 4200

  projects: [
    {
      name: 'synpress-tests',
      testDir: './src',
      testMatch: ['**/*.spec.ts'],
    },
  ],
});
