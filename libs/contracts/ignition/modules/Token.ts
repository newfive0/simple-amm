import { buildModule } from '@nomicfoundation/hardhat-ignition/modules';

const TokenPairModule = buildModule('TokenPairModule', (m) => {
  const initialSupply = m.getParameter(
    'initialSupply',
    1_000_000n * 10n ** 18n,
  ); // 1 million tokens

  const tokenA = m.contract('Token', ['Token A', 'TKA', initialSupply], {
    id: 'TokenA',
  });
  const tokenB = m.contract('Token', ['Token B', 'TKB', initialSupply], {
    id: 'TokenB',
  });

  return { tokenA, tokenB };
});

export default TokenPairModule;
