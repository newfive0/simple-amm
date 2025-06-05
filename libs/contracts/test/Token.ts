import { ethers } from 'ethers';
import { expect } from 'chai';
import '@nomicfoundation/hardhat-chai-matchers';
import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import hre from 'hardhat';
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';
import type { Token } from '../typechain-types';

describe('Token', () => {
  const NAME = 'MyToken';
  const SYMBOL = 'MTK';
  const TOTAL_SUPPLY = ethers.parseEther('1000000'); // 1M tokens

  async function deployTokenFixture() {
    const [deployer, user] = await hre.ethers.getSigners();

    const Token = await hre.ethers.getContractFactory('Token');
    const token = (await Token.deploy(NAME, SYMBOL, TOTAL_SUPPLY)) as Token;
    await token.waitForDeployment();

    return { token, deployer, user };
  }

  let token: Token;
  let deployer: SignerWithAddress;
  let user: SignerWithAddress;

  beforeEach(async () => {
    const fixture = await loadFixture(deployTokenFixture);
    token = fixture.token;
    deployer = fixture.deployer;
    user = fixture.user;
  });

  it('should set name and symbol correctly', async () => {
    expect(await token.name()).to.equal(NAME);
    expect(await token.symbol()).to.equal(SYMBOL);
  });

  it('should assign total supply to deployer', async () => {
    expect(await token.totalSupply()).to.equal(TOTAL_SUPPLY);
    expect(await token.balanceOf(deployer.address)).to.equal(TOTAL_SUPPLY);
  });

  it('should allow transfers', async () => {
    const amount = ethers.parseEther('500');
    await token.transfer(user.address, amount);

    expect(await token.balanceOf(user.address)).to.equal(amount);
  });

  it('should emit Transfer event', async () => {
    const amount = ethers.parseEther('100');

    await expect(token.transfer(user.address, amount))
      .to.emit(token, 'Transfer')
      .withArgs(deployer.address, user.address, amount);
  });
});
