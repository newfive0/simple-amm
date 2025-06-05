import { buildModule } from '@nomicfoundation/hardhat-ignition/modules';

const TokenModule = buildModule('TokenModule', (m) => {
  const initialSupply = m.getParameter(
    'initialSupply',
    1_000_000n * 10n ** 18n,
  ); // 1 million tokens

  const simplestToken = m.contract(
    'Token',
    ['Simplest Token', 'SIMPLEST', initialSupply],
    {
      id: 'SimplestToken',
    },
  );

  return { simplestToken };
});

export default TokenModule;
