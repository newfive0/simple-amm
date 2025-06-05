import { buildModule } from '@nomicfoundation/hardhat-ignition/modules';
import TokenModule from './Token';

const AMMPoolModule = buildModule('AMMPoolModule', (m) => {
  // Use the TokenModule to get the deployed token
  const { simplestToken } = m.useModule(TokenModule);

  // Deploy the AMMPool with only simplestToken address (ETH is native)
  const ammPool = m.contract('AMMPool', [simplestToken]);

  return { ammPool, simplestToken };
});

export default AMMPoolModule;
