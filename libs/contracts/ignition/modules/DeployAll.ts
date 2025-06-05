import { buildModule } from '@nomicfoundation/hardhat-ignition/modules';
import AMMPoolModule from './AMMPool';

const DeployAllModule = buildModule('DeployAllModule', (m) => {
  // Deploy everything: token and AMM pool
  const { ammPool, simplestToken } = m.useModule(AMMPoolModule);

  return { ammPool, simplestToken };
});

export default DeployAllModule;
