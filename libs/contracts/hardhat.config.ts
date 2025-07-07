import type { HardhatUserConfig } from 'hardhat/config';
import '@nomicfoundation/hardhat-ethers';
import '@nomicfoundation/hardhat-ignition-ethers';
import '@nomicfoundation/hardhat-toolbox';

const config: HardhatUserConfig = {
  solidity: '0.8.28',
  paths: {
    sources: './src',
    tests: './test',
  },
  typechain: {
    outDir: './artifacts/typechain-types',
    target: 'ethers-v6',
  },
};

export default config;
