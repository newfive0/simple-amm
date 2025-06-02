import { buildModule } from '@nomicfoundation/hardhat-ignition/modules';
import TokenPairModule from './Token';

const AMMPoolModule = buildModule('AMMPoolModule', (m) => {
  // Use the TokenPairModule to get the deployed tokens
  const { tokenA, tokenB } = m.useModule(TokenPairModule);

  // Deploy the AMMPool with the token addresses
  const ammPool = m.contract('AMMPool', [tokenA, tokenB]);

  return { ammPool, tokenA, tokenB };
});

export default AMMPoolModule;
