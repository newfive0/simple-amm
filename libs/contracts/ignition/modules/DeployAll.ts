import { buildModule } from '@nomicfoundation/hardhat-ignition/modules';
import AMMPoolModule from './AMMPool';

const DeployAllModule = buildModule('DeployAllModule', (m) => {
  // Deploy everything: tokens and AMM pool
  const { ammPool, tokenA, tokenB } = m.useModule(AMMPoolModule);

  return { ammPool, tokenA, tokenB };
});

export default DeployAllModule;
