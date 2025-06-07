/// <reference types='vitest' />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { copyFileSync, existsSync, mkdirSync } from 'fs';

// Plugin to copy deployment artifacts
const copyDeploymentArtifacts = () => {
  return {
    name: 'copy-deployment-artifacts',
    buildStart() {
      const sourceFile = resolve(
        __dirname,
        '../../libs/contracts/ignition/deployments/chain-31337/deployed_addresses.json',
      );
      const targetDir = resolve(__dirname, 'public');
      const targetFile = resolve(targetDir, 'deployed_addresses.json');

      if (!existsSync(targetDir)) {
        mkdirSync(targetDir, { recursive: true });
      }

      if (existsSync(sourceFile)) {
        copyFileSync(sourceFile, targetFile);
        console.log('Copied deployment artifacts to public directory');
      } else {
        console.warn('Deployment artifacts not found at:', sourceFile);
      }
    },
  };
};

export default defineConfig(() => ({
  root: __dirname,
  cacheDir: '../../node_modules/.vite/apps/frontend',
  server: {
    port: 4200,
    host: 'localhost',
  },
  preview: {
    port: 4300,
    host: 'localhost',
  },
  plugins: [react(), copyDeploymentArtifacts()],
  // Uncomment this if you are using workers.
  // worker: {
  //  plugins: [ nxViteTsPaths() ],
  // },
  build: {
    outDir: './dist',
    emptyOutDir: true,
    reportCompressedSize: true,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
  test: {
    watch: false,
    globals: true,
    environment: 'jsdom',
    include: ['{src,tests}/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    reporters: ['default'],
    coverage: {
      reportsDirectory: './test-output/vitest/coverage',
      provider: 'v8' as const,
    },
  },
}));
