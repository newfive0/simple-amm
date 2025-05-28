import { ethers } from 'ethers';
import { expect } from 'chai';
import '@nomicfoundation/hardhat-chai-matchers';
import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import hre from 'hardhat';

describe('AMMPool', () => {
  // Constants for token setup
  const NAME_A = 'Ether';
  const SYMBOL_A = 'ETH';
  const NAME_B = 'Tether USD';
  const SYMBOL_B = 'USDT';
  const TOTAL_SUPPLY = ethers.parseEther('1000000'); // 1M tokens

  // Test constants - ETH/USDT realistic ratio (1 ETH = 2639 USDT)
  const INITIAL_LIQUIDITY_A = ethers.parseEther('10'); // 10 ETH
  const INITIAL_LIQUIDITY_B = ethers.parseEther('26390'); // 26390 USDT (2639 * 10)
  const SWAP_AMOUNT = ethers.parseEther('1'); // 1 ETH or equivalent in tests

  // Base deployment fixture
  async function deployPoolFixture() {
    const [owner, user1, user2] = await hre.ethers.getSigners();

    // Deploy tokens
    const TokenFactory = await hre.ethers.getContractFactory('Token');
    const tokenA = await TokenFactory.deploy(NAME_A, SYMBOL_A, TOTAL_SUPPLY);
    const tokenB = await TokenFactory.deploy(NAME_B, SYMBOL_B, TOTAL_SUPPLY);

    await tokenA.waitForDeployment();
    await tokenB.waitForDeployment();

    // Deploy AMM pool
    const AMMPoolFactory = await hre.ethers.getContractFactory('AMMPool');
    const ammPool = await AMMPoolFactory.deploy(
      await tokenA.getAddress(),
      await tokenB.getAddress(),
    );

    await ammPool.waitForDeployment();

    // Transfer tokens to users for testing
    // Increase the amount of tokenB (USDT) to account for the higher exchange rate
    await tokenA.transfer(user1.address, ethers.parseEther('10000'));
    await tokenB.transfer(user1.address, ethers.parseEther('30000')); // Increased from 10000 to 30000
    await tokenA.transfer(user2.address, ethers.parseEther('10000'));
    await tokenB.transfer(user2.address, ethers.parseEther('30000')); // Increased from 10000 to 30000

    return { ammPool, tokenA, tokenB, owner, user1, user2 };
  }

  // Fixture with liquidity already added
  async function deployPoolWithLiquidityFixture() {
    const { ammPool, tokenA, tokenB, owner, user1, user2 } =
      await deployPoolFixture();

    // Add initial liquidity
    await tokenA
      .connect(user1)
      .approve(await ammPool.getAddress(), INITIAL_LIQUIDITY_A);
    await tokenB
      .connect(user1)
      .approve(await ammPool.getAddress(), INITIAL_LIQUIDITY_B);
    await ammPool
      .connect(user1)
      .addLiquidity(INITIAL_LIQUIDITY_A, INITIAL_LIQUIDITY_B);

    return { ammPool, tokenA, tokenB, owner, user1, user2 };
  }

  describe('Deployment', () => {
    it('should correctly set token addresses', async () => {
      const { ammPool, tokenA, tokenB } = await loadFixture(deployPoolFixture);
      expect(await ammPool.tokenA()).to.equal(await tokenA.getAddress());
      expect(await ammPool.tokenB()).to.equal(await tokenB.getAddress());
    });

    it('should initialize with zero reserves and liquidity', async () => {
      const { ammPool } = await loadFixture(deployPoolFixture);
      expect(await ammPool.reserveA()).to.equal(0);
      expect(await ammPool.reserveB()).to.equal(0);
      expect(await ammPool.totalLiquidity()).to.equal(0);
    });
  });

  describe('Adding Liquidity', () => {
    it('should add initial liquidity correctly', async () => {
      const { ammPool, tokenA, tokenB, user1 } =
        await loadFixture(deployPoolFixture);

      // Approve tokens
      await tokenA
        .connect(user1)
        .approve(await ammPool.getAddress(), INITIAL_LIQUIDITY_A);
      await tokenB
        .connect(user1)
        .approve(await ammPool.getAddress(), INITIAL_LIQUIDITY_B);

      // Add liquidity
      const addLiquidityTx = await ammPool
        .connect(user1)
        .addLiquidity(INITIAL_LIQUIDITY_A, INITIAL_LIQUIDITY_B);

      // Calculate expected liquidity (sqrt of product for first liquidity provision)
      const initialA = Number(ethers.formatEther(INITIAL_LIQUIDITY_A));
      const initialB = Number(ethers.formatEther(INITIAL_LIQUIDITY_B));
      const sqrtValue = Math.sqrt(initialA * initialB);
      // Use BigInt for precision and format to match blockchain calculation
      const expectedLiquidity = BigInt(Math.floor(sqrtValue * 10 ** 18));

      // Get actual liquidity
      const actualLiquidity = await ammPool.totalLiquidity();

      // Check state changes - allow for a small precision difference (0.001%)
      expect(await ammPool.reserveA()).to.equal(INITIAL_LIQUIDITY_A);
      expect(await ammPool.reserveB()).to.equal(INITIAL_LIQUIDITY_B);

      // Calculate the difference as a percentage
      const difference =
        expectedLiquidity > actualLiquidity
          ? expectedLiquidity - actualLiquidity
          : actualLiquidity - expectedLiquidity;
      const percentDifference =
        Number((difference * 10000n) / expectedLiquidity) / 100;

      // Assert that the difference is very small (less than 0.001%)
      expect(percentDifference).to.be.lessThan(0.001);

      // Check user's liquidity matches the total
      expect(await ammPool.liquidity(user1.address)).to.equal(actualLiquidity);

      // Check event
      await expect(addLiquidityTx)
        .to.emit(ammPool, 'LiquidityAdded')
        .withArgs(
          user1.address,
          INITIAL_LIQUIDITY_A,
          INITIAL_LIQUIDITY_B,
          actualLiquidity,
        );
    });

    it('should add additional liquidity proportionally', async () => {
      const { ammPool, tokenA, tokenB, user2 } = await loadFixture(
        deployPoolWithLiquidityFixture,
      );

      const initialTotalLiquidity = await ammPool.totalLiquidity();

      // Now add more liquidity from user2
      // Maintaining the same ratio 1:2639
      const additionalLiquidityA = ethers.parseEther('5'); // 5 ETH
      const additionalLiquidityB = ethers.parseEther('13195'); // 13195 USDT (2639 * 5)

      await tokenA
        .connect(user2)
        .approve(await ammPool.getAddress(), additionalLiquidityA);
      await tokenB
        .connect(user2)
        .approve(await ammPool.getAddress(), additionalLiquidityB);

      const addLiquidityTx = await ammPool
        .connect(user2)
        .addLiquidity(additionalLiquidityA, additionalLiquidityB);

      // Calculate expected liquidity share
      const expectedShare =
        (additionalLiquidityA * initialTotalLiquidity) / INITIAL_LIQUIDITY_A;

      // Check state after addition
      expect(await ammPool.reserveA()).to.equal(
        INITIAL_LIQUIDITY_A + additionalLiquidityA,
      );
      expect(await ammPool.reserveB()).to.equal(
        INITIAL_LIQUIDITY_B + additionalLiquidityB,
      );
      expect(await ammPool.liquidity(user2.address)).to.equal(expectedShare);

      // Check event
      await expect(addLiquidityTx)
        .to.emit(ammPool, 'LiquidityAdded')
        .withArgs(
          user2.address,
          additionalLiquidityA,
          additionalLiquidityB,
          expectedShare,
        );
    });

    it('should revert when adding zero liquidity', async () => {
      const { ammPool, user1 } = await loadFixture(deployPoolFixture);

      await expect(
        ammPool.connect(user1).addLiquidity(0, INITIAL_LIQUIDITY_B),
      ).to.be.revertedWithCustomError(ammPool, 'InvalidAmounts');

      await expect(
        ammPool.connect(user1).addLiquidity(INITIAL_LIQUIDITY_A, 0),
      ).to.be.revertedWithCustomError(ammPool, 'InvalidAmounts');
    });
  });

  describe('Removing Liquidity', () => {
    it('should remove liquidity correctly', async () => {
      const { ammPool, tokenA, tokenB, user1 } = await loadFixture(
        deployPoolWithLiquidityFixture,
      );

      const userLiquidity = await ammPool.liquidity(user1.address);
      const halfLiquidity = userLiquidity / 2n;

      // Calculate expected token amounts
      const expectedAmountA =
        (halfLiquidity * (await ammPool.reserveA())) /
        (await ammPool.totalLiquidity());
      const expectedAmountB =
        (halfLiquidity * (await ammPool.reserveB())) /
        (await ammPool.totalLiquidity());

      // Remove liquidity
      const removeLiquidityTx = await ammPool
        .connect(user1)
        .removeLiquidity(halfLiquidity);

      // Check state changes
      expect(await ammPool.reserveA()).to.equal(
        INITIAL_LIQUIDITY_A - expectedAmountA,
      );
      expect(await ammPool.reserveB()).to.equal(
        INITIAL_LIQUIDITY_B - expectedAmountB,
      );
      expect(await ammPool.totalLiquidity()).to.equal(
        userLiquidity - halfLiquidity,
      );
      expect(await ammPool.liquidity(user1.address)).to.equal(
        userLiquidity - halfLiquidity,
      );

      // Check token balances updated correctly
      expect(await tokenA.balanceOf(user1.address)).to.equal(
        ethers.parseEther('10000') - INITIAL_LIQUIDITY_A + expectedAmountA,
      );
      expect(await tokenB.balanceOf(user1.address)).to.equal(
        ethers.parseEther('30000') - INITIAL_LIQUIDITY_B + expectedAmountB,
      );

      // Check event
      await expect(removeLiquidityTx)
        .to.emit(ammPool, 'LiquidityRemoved')
        .withArgs(
          user1.address,
          expectedAmountA,
          expectedAmountB,
          halfLiquidity,
        );
    });

    it('should revert when removing more liquidity than owned', async () => {
      const { ammPool, user1 } = await loadFixture(
        deployPoolWithLiquidityFixture,
      );
      const userLiquidity = await ammPool.liquidity(user1.address);

      await expect(
        ammPool.connect(user1).removeLiquidity(userLiquidity + 1n),
      ).to.be.revertedWithCustomError(ammPool, 'InsufficientLiquidity');
    });

    it('should revert when removing zero liquidity', async () => {
      const { ammPool, user1 } = await loadFixture(
        deployPoolWithLiquidityFixture,
      );

      await expect(
        ammPool.connect(user1).removeLiquidity(0),
      ).to.be.revertedWithCustomError(ammPool, 'InsufficientLiquidity');
    });

    it('should allow removing all liquidity', async () => {
      const { ammPool, user1 } = await loadFixture(
        deployPoolWithLiquidityFixture,
      );
      const userLiquidity = await ammPool.liquidity(user1.address);

      await ammPool.connect(user1).removeLiquidity(userLiquidity);

      expect(await ammPool.totalLiquidity()).to.equal(0);
      expect(await ammPool.reserveA()).to.equal(0);
      expect(await ammPool.reserveB()).to.equal(0);
      expect(await ammPool.liquidity(user1.address)).to.equal(0);
    });
  });

  describe('Swapping Tokens', () => {
    it('should swap tokenA for tokenB correctly', async () => {
      const { ammPool, tokenA, tokenB, user2 } = await loadFixture(
        deployPoolWithLiquidityFixture,
      );

      // Use 0.1 ETH for swap to get USDT
      const ethSwapAmount = ethers.parseEther('0.1');

      await tokenA
        .connect(user2)
        .approve(await ammPool.getAddress(), ethSwapAmount);

      const reserveA = await ammPool.reserveA();
      const reserveB = await ammPool.reserveB();

      // Calculate expected output
      const amountWithFee = (ethSwapAmount * 997n) / 1000n;
      const expectedOutput =
        (reserveB * amountWithFee) / (reserveA + amountWithFee);

      // User balances before
      const user2TokenABefore = await tokenA.balanceOf(user2.address);
      const user2TokenBBefore = await tokenB.balanceOf(user2.address);

      // Perform swap
      const swapAToBTx = await ammPool
        .connect(user2)
        .swap(await tokenA.getAddress(), ethSwapAmount);

      // Check reserves
      expect(await ammPool.reserveA()).to.equal(reserveA + ethSwapAmount);
      expect(await ammPool.reserveB()).to.equal(reserveB - expectedOutput);

      // Check user balances
      expect(await tokenA.balanceOf(user2.address)).to.equal(
        user2TokenABefore - ethSwapAmount,
      );
      expect(await tokenB.balanceOf(user2.address)).to.equal(
        user2TokenBBefore + expectedOutput,
      );

      // Check event
      await expect(swapAToBTx)
        .to.emit(ammPool, 'Swap')
        .withArgs(
          user2.address,
          await tokenA.getAddress(),
          ethSwapAmount,
          expectedOutput,
        );
    });

    it('should swap tokenB for tokenA correctly', async () => {
      const { ammPool, tokenA, tokenB, user2 } = await loadFixture(
        deployPoolWithLiquidityFixture,
      );

      // Use 263.9 USDT for swap (roughly 0.1 ETH worth)
      const usdtSwapAmount = ethers.parseEther('264'); // Round to integer for simplicity

      await tokenB
        .connect(user2)
        .approve(await ammPool.getAddress(), usdtSwapAmount);

      const reserveA = await ammPool.reserveA();
      const reserveB = await ammPool.reserveB();

      // Calculate expected output
      const amountWithFee = (usdtSwapAmount * 997n) / 1000n;
      const expectedOutput =
        (reserveA * amountWithFee) / (reserveB + amountWithFee);

      // User balances before
      const user2TokenABefore = await tokenA.balanceOf(user2.address);
      const user2TokenBBefore = await tokenB.balanceOf(user2.address);

      // Perform swap
      const swapBToATx = await ammPool
        .connect(user2)
        .swap(await tokenB.getAddress(), usdtSwapAmount);

      // Check reserves
      expect(await ammPool.reserveB()).to.equal(reserveB + usdtSwapAmount);
      expect(await ammPool.reserveA()).to.equal(reserveA - expectedOutput);

      // Check user balances
      expect(await tokenB.balanceOf(user2.address)).to.equal(
        user2TokenBBefore - usdtSwapAmount,
      );
      expect(await tokenA.balanceOf(user2.address)).to.equal(
        user2TokenABefore + expectedOutput,
      );

      // Check event
      await expect(swapBToATx)
        .to.emit(ammPool, 'Swap')
        .withArgs(
          user2.address,
          await tokenB.getAddress(),
          usdtSwapAmount,
          expectedOutput,
        );
    });

    it('should revert when swapping zero amount', async () => {
      const { ammPool, tokenA, user2 } = await loadFixture(
        deployPoolWithLiquidityFixture,
      );
      await expect(
        ammPool.connect(user2).swap(await tokenA.getAddress(), 0),
      ).to.be.revertedWithCustomError(ammPool, 'InvalidAmount');
    });

    it('should revert when swapping unsupported token', async () => {
      const { ammPool, user2, owner } = await loadFixture(
        deployPoolWithLiquidityFixture,
      );
      const invalidToken = owner.address; // using an address that's not a token
      await expect(
        ammPool.connect(user2).swap(invalidToken, SWAP_AMOUNT),
      ).to.be.revertedWithCustomError(ammPool, 'UnsupportedToken');
    });
  });
});
