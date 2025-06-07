import { buildModule } from '@nomicfoundation/hardhat-ignition/modules';

const TokenModule = buildModule('TokenModule', (m) => {
  const initialSupply = m.getParameter(
    'initialSupply',
    1_000_000n * 10n ** 18n,
  ); // 1 million tokens

  const targetAddress = m.getParameter(
    'targetAddress',
    '0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199',
  );

  const mintAmount = m.getParameter('mintAmount', 100n * 10n ** 18n); // 100 tokens

  const simplestToken = m.contract(
    'Token',
    ['Simplest Token', 'SIMP', initialSupply],
    {
      id: 'SimplestToken',
    },
  );

  // Mint additional tokens to the target address
  m.call(simplestToken, 'mint', [targetAddress, mintAmount]);

  return { simplestToken };
});

export default TokenModule;
