import type { HardhatUserConfig } from 'hardhat/config';
import '@nomicfoundation/hardhat-ethers';

const config: HardhatUserConfig = {
  solidity: '0.8.28',
  paths: {
    sources: './src',
    tests: './test',
  },
};

export default config;
