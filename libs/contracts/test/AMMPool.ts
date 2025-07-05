import { ethers } from 'ethers';
import { expect } from 'chai';
import '@nomicfoundation/hardhat-chai-matchers';
import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import hre from 'hardhat';
import type { AMMPool, Token } from '../typechain-types';

describe('AMMPool', () => {
  // Constants for token setup
  const NAME_SIMPLEST = 'Simplest Token';
  const SYMBOL_SIMPLEST = 'SIMPLEST';
  const TOTAL_SUPPLY = ethers.parseEther('1000000'); // 1M tokens

  // Test constants - SimplestToken/ETH realistic ratio
  const INITIAL_LIQUIDITY_SIMPLEST = ethers.parseEther('10'); // 10 SimplestToken
  const INITIAL_LIQUIDITY_ETH = ethers.parseEther('1'); // 1 ETH
  const SWAP_AMOUNT = ethers.parseEther('1'); // 1 SimplestToken or equivalent in tests

  // Base deployment fixture
  const deployPoolFixture = async () => {
    const [owner, user1, user2] = await hre.ethers.getSigners();

    // Deploy tokens
    const TokenFactory = await hre.ethers.getContractFactory('Token');
    const simplestToken = (await TokenFactory.deploy(
      NAME_SIMPLEST,
      SYMBOL_SIMPLEST,
      TOTAL_SUPPLY,
    )) as Token;

    await simplestToken.waitForDeployment();

    // Deploy AMM pool
    const AMMPoolFactory = await hre.ethers.getContractFactory('AMMPool');
    const ammPool = (await AMMPoolFactory.deploy(
      await simplestToken.getAddress(),
    )) as AMMPool;

    await ammPool.waitForDeployment();

    // Transfer tokens to users for testing
    await simplestToken.transfer(user1.address, ethers.parseEther('10000'));
    await simplestToken.transfer(user2.address, ethers.parseEther('10000'));

    return { ammPool, simplestToken, owner, user1, user2 };
  }

  // Fixture with liquidity already added
  const deployPoolWithLiquidityFixture = async () => {
    const { ammPool, simplestToken, owner, user1, user2 } =
      await deployPoolFixture();

    // Add initial liquidity
    await simplestToken
      .connect(user1)
      .approve(await ammPool.getAddress(), INITIAL_LIQUIDITY_SIMPLEST);
    await ammPool.connect(user1).addLiquidity(INITIAL_LIQUIDITY_SIMPLEST, 0, {
      value: INITIAL_LIQUIDITY_ETH,
    });

    return { ammPool, simplestToken, owner, user1, user2 };
  }

  describe('Constructor', () => {
    it('should initialize with correct token addresses', async () => {
      const { ammPool, simplestToken } = await loadFixture(deployPoolFixture);

      expect(await ammPool.simplestToken()).to.equal(
        await simplestToken.getAddress(),
      );
    });
  });

  describe('Adding Liquidity', () => {
    it('should add initial liquidity correctly', async () => {
      const { ammPool, simplestToken, user1 } =
        await loadFixture(deployPoolFixture);

      // Approve tokens
      await simplestToken
        .connect(user1)
        .approve(await ammPool.getAddress(), INITIAL_LIQUIDITY_SIMPLEST);

      // Add liquidity
      const addLiquidityTx = await ammPool
        .connect(user1)
        .addLiquidity(INITIAL_LIQUIDITY_SIMPLEST, 0, {
          value: INITIAL_LIQUIDITY_ETH,
        });

      // Calculate expected liquidity (sqrt of product for first liquidity provision)
      const initialSimplest = Number(
        ethers.formatEther(INITIAL_LIQUIDITY_SIMPLEST),
      );
      const initialETH = Number(ethers.formatEther(INITIAL_LIQUIDITY_ETH));
      const sqrtValue = Math.sqrt(initialSimplest * initialETH);
      // Use BigInt for precision and format to match blockchain calculation
      const expectedLiquidity = BigInt(Math.floor(sqrtValue * 10 ** 18));

      // Get actual liquidity
      const actualLiquidity = await ammPool.totalLPTokens();

      // Check state changes - allow for a small precision difference (0.001%)
      expect(await ammPool.reserveSimplest()).to.equal(
        INITIAL_LIQUIDITY_SIMPLEST,
      );
      expect(await ammPool.reserveETH()).to.equal(INITIAL_LIQUIDITY_ETH);

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
      expect(await ammPool.lpTokens(user1.address)).to.equal(actualLiquidity);

      // Check event
      await expect(addLiquidityTx)
        .to.emit(ammPool, 'LiquidityAdded')
        .withArgs(
          user1.address,
          INITIAL_LIQUIDITY_SIMPLEST,
          INITIAL_LIQUIDITY_ETH,
          actualLiquidity,
        );
    });

    it('should revert when adding zero liquidity', async () => {
      const { ammPool, user1 } = await loadFixture(deployPoolFixture);

      await expect(
        ammPool
          .connect(user1)
          .addLiquidity(0, 0, { value: INITIAL_LIQUIDITY_ETH }),
      ).to.be.revertedWithCustomError(ammPool, 'InvalidAmount');

      await expect(
        ammPool
          .connect(user1)
          .addLiquidity(INITIAL_LIQUIDITY_SIMPLEST, 0, { value: 0 }),
      ).to.be.revertedWithCustomError(ammPool, 'InvalidAmount');
    });
  });

  describe('Swapping Tokens', () => {
    it('should swap simplestToken for ETH correctly', async () => {
      const { ammPool, simplestToken, user2 } = await loadFixture(
        deployPoolWithLiquidityFixture,
      );

      // Use 0.1 SimplestToken for swap to get ETH
      const simplestTokenSwapAmount = ethers.parseEther('0.1');

      await simplestToken
        .connect(user2)
        .approve(await ammPool.getAddress(), simplestTokenSwapAmount);

      const reserveSimplest = await ammPool.reserveSimplest();
      const reserveETH = await ammPool.reserveETH();

      // Calculate expected output
      const amountWithFee = (simplestTokenSwapAmount * 997n) / 1000n;
      const expectedOutput =
        (reserveETH * amountWithFee) / (reserveSimplest + amountWithFee);

      // User balances before
      const user2SimplestTokenBefore = await simplestToken.balanceOf(
        user2.address,
      );
      const user2ETHBefore = await hre.ethers.provider.getBalance(
        user2.address,
      );

      // Perform swap
      const swapTx = await ammPool
        .connect(user2)
        .swap(await simplestToken.getAddress(), simplestTokenSwapAmount, 0);

      // Check reserves
      expect(await ammPool.reserveSimplest()).to.equal(
        reserveSimplest + simplestTokenSwapAmount,
      );
      expect(await ammPool.reserveETH()).to.equal(reserveETH - expectedOutput);

      // Check user balances
      expect(await simplestToken.balanceOf(user2.address)).to.equal(
        user2SimplestTokenBefore - simplestTokenSwapAmount,
      );

      // Check ETH balance (account for gas costs with closeTo)
      const user2ETHAfter = await hre.ethers.provider.getBalance(user2.address);
      expect(user2ETHAfter).to.be.closeTo(
        user2ETHBefore + expectedOutput,
        ethers.parseEther('0.01'), // Allow for gas costs
      );

      // Check event
      await expect(swapTx)
        .to.emit(ammPool, 'Swap')
        .withArgs(
          user2.address,
          await simplestToken.getAddress(),
          simplestTokenSwapAmount,
          expectedOutput,
        );
    });

    it('should swap ETH for simplestToken correctly', async () => {
      const { ammPool, simplestToken, user2 } = await loadFixture(
        deployPoolWithLiquidityFixture,
      );

      // Use 0.01 ETH for swap
      const ethSwapAmount = ethers.parseEther('0.01');

      const reserveSimplest = await ammPool.reserveSimplest();
      const reserveETH = await ammPool.reserveETH();

      // Calculate expected output
      const amountWithFee = (ethSwapAmount * 997n) / 1000n;
      const expectedOutput =
        (reserveSimplest * amountWithFee) / (reserveETH + amountWithFee);

      // User balances before
      const user2SimplestTokenBefore = await simplestToken.balanceOf(
        user2.address,
      );

      // Perform swap (using address(0) to indicate ETH)
      const swapTx = await ammPool
        .connect(user2)
        .swap(ethers.ZeroAddress, 0, 0, { value: ethSwapAmount });

      // Check reserves
      expect(await ammPool.reserveETH()).to.equal(reserveETH + ethSwapAmount);
      expect(await ammPool.reserveSimplest()).to.equal(
        reserveSimplest - expectedOutput,
      );

      // Check user balances
      expect(await simplestToken.balanceOf(user2.address)).to.equal(
        user2SimplestTokenBefore + expectedOutput,
      );

      // Check event
      await expect(swapTx)
        .to.emit(ammPool, 'Swap')
        .withArgs(
          user2.address,
          ethers.ZeroAddress,
          ethSwapAmount,
          expectedOutput,
        );
    });

    it('should revert when swapping zero amount', async () => {
      const { ammPool, simplestToken, user2 } = await loadFixture(
        deployPoolWithLiquidityFixture,
      );
      await expect(
        ammPool.connect(user2).swap(await simplestToken.getAddress(), 0, 0),
      ).to.be.revertedWithCustomError(ammPool, 'InvalidAmount');
    });

    it('should revert when swapping unsupported token', async () => {
      const { ammPool, user2, owner } = await loadFixture(
        deployPoolWithLiquidityFixture,
      );
      const invalidToken = owner.address; // using an address that's not a token
      await expect(
        ammPool.connect(user2).swap(invalidToken, SWAP_AMOUNT, 0),
      ).to.be.revertedWithCustomError(ammPool, 'UnsupportedToken');
    });
  });

  describe('Slippage Protection', () => {
    describe('Swap with Slippage Protection', () => {
      it('should have a swap function that accepts minAmountOut parameter', async () => {
        const { ammPool, simplestToken, user2 } = await loadFixture(
          deployPoolWithLiquidityFixture,
        );

        const simplestTokenSwapAmount = ethers.parseEther('0.1');
        
        // Get the expected output first, then set reasonable minimum
        const expectedOutput = await ammPool.getSwapOutput(
          await simplestToken.getAddress(), 
          simplestTokenSwapAmount
        );
        const minAmountOut = (expectedOutput * 95n) / 100n; // 5% slippage tolerance

        await simplestToken
          .connect(user2)
          .approve(await ammPool.getAddress(), simplestTokenSwapAmount);

        // This should work with slippage protection
        await expect(
          ammPool
            .connect(user2)
            .swap(
              await simplestToken.getAddress(), 
              simplestTokenSwapAmount, 
              minAmountOut
            )
        ).to.not.be.reverted;
      });

      it('should revert when output is below minimum (slippage too high)', async () => {
        const { ammPool, simplestToken, user2 } = await loadFixture(
          deployPoolWithLiquidityFixture,
        );

        const simplestTokenSwapAmount = ethers.parseEther('0.1');
        const unrealisticMinOutput = ethers.parseEther('1'); // Much higher than possible

        await simplestToken
          .connect(user2)
          .approve(await ammPool.getAddress(), simplestTokenSwapAmount);

        await expect(
          ammPool
            .connect(user2)
            .swap(
              await simplestToken.getAddress(), 
              simplestTokenSwapAmount, 
              unrealisticMinOutput
            )
        ).to.be.revertedWithCustomError(ammPool, 'InsufficientOutput');
      });

      it('should allow ETH swaps with slippage protection', async () => {
        const { ammPool, user2 } = await loadFixture(
          deployPoolWithLiquidityFixture,
        );

        const ethSwapAmount = ethers.parseEther('0.01');
        const minAmountOut = ethers.parseEther('0.01'); // Reasonable minimum

        await expect(
          ammPool
            .connect(user2)
            .swap(ethers.ZeroAddress, 0, minAmountOut, { 
              value: ethSwapAmount 
            })
        ).to.not.be.reverted;
      });

      it('should have view function to calculate expected swap output', async () => {
        const { ammPool, simplestToken } = await loadFixture(
          deployPoolWithLiquidityFixture,
        );

        const amountIn = ethers.parseEther('0.1');
        
        // Should be able to get expected output for token->ETH swap
        const expectedOutput = await ammPool.getSwapOutput(
          await simplestToken.getAddress(), 
          amountIn
        );
        
        expect(expectedOutput).to.be.gt(0);
      });
    });

    describe('Add Liquidity with Slippage Protection', () => {
      it('should accept minimum LP token parameter', async () => {
        const { ammPool, simplestToken, user2 } = await loadFixture(
          deployPoolWithLiquidityFixture,
        );

        const amountSimplest = ethers.parseEther('1');
        const amountETH = ethers.parseEther('0.1');
        const minLPTokens = ethers.parseEther('0.1'); // Reasonable minimum

        await simplestToken
          .connect(user2)
          .approve(await ammPool.getAddress(), amountSimplest);

        await expect(
          ammPool
            .connect(user2)
            .addLiquidity(amountSimplest, minLPTokens, { 
              value: amountETH 
            })
        ).to.not.be.reverted;
      });

      it('should revert when LP tokens received are below minimum', async () => {
        const { ammPool, simplestToken, user2 } = await loadFixture(
          deployPoolWithLiquidityFixture,
        );

        const amountSimplest = ethers.parseEther('1');
        const amountETH = ethers.parseEther('0.1');
        const unrealisticMinLP = ethers.parseEther('100'); // Much higher than possible

        await simplestToken
          .connect(user2)
          .approve(await ammPool.getAddress(), amountSimplest);

        await expect(
          ammPool
            .connect(user2)
            .addLiquidity(amountSimplest, unrealisticMinLP, { 
              value: amountETH 
            })
        ).to.be.revertedWithCustomError(ammPool, 'InsufficientOutput');
      });

      it('should have view function to calculate expected LP tokens', async () => {
        const { ammPool } = await loadFixture(
          deployPoolWithLiquidityFixture,
        );

        const amountSimplest = ethers.parseEther('1');
        const amountETH = ethers.parseEther('0.1');
        
        const expectedLP = await ammPool.getLiquidityOutput(amountSimplest, amountETH);
        expect(expectedLP).to.be.gt(0);
      });
    });

    describe('Remove Liquidity with Slippage Protection', () => {
      it('should accept minimum token amounts parameters', async () => {
        const { ammPool, user1 } = await loadFixture(
          deployPoolWithLiquidityFixture,
        );

        const lpTokenAmount = ethers.parseEther('0.5');
        const minAmountSimplest = ethers.parseEther('0.1');
        const minAmountETH = ethers.parseEther('0.01');

        await expect(
          ammPool
            .connect(user1)
            .removeLiquidity(lpTokenAmount, minAmountSimplest, minAmountETH)
        ).to.not.be.reverted;
      });

      it('should revert when token amounts are below minimums', async () => {
        const { ammPool, user1 } = await loadFixture(
          deployPoolWithLiquidityFixture,
        );

        const lpTokenAmount = ethers.parseEther('0.5');
        const unrealisticMinSimplest = ethers.parseEther('100');
        const unrealisticMinETH = ethers.parseEther('10');

        await expect(
          ammPool
            .connect(user1)
            .removeLiquidity(lpTokenAmount, unrealisticMinSimplest, unrealisticMinETH)
        ).to.be.revertedWithCustomError(ammPool, 'InsufficientOutput');
      });

      it('should have view function to calculate expected removal amounts', async () => {
        const { ammPool } = await loadFixture(
          deployPoolWithLiquidityFixture,
        );

        const lpTokenAmount = ethers.parseEther('0.5');
        const [expectedSimplest, expectedETH] = await ammPool.getRemoveLiquidityOutput(lpTokenAmount);
        
        expect(expectedSimplest).to.be.gt(0);
        expect(expectedETH).to.be.gt(0);
      });
    });

    describe('Slippage Tolerance Calculations', () => {
      it('should handle 1% slippage tolerance correctly', async () => {
        const { ammPool, simplestToken, user2 } = await loadFixture(
          deployPoolWithLiquidityFixture,
        );

        const amountIn = ethers.parseEther('0.1');
        const expectedOutput = await ammPool.getSwapOutput(
          await simplestToken.getAddress(), 
          amountIn
        );
        
        // 1% slippage tolerance
        const minOutput = (expectedOutput * 99n) / 100n;

        await simplestToken
          .connect(user2)
          .approve(await ammPool.getAddress(), amountIn);

        await expect(
          ammPool
            .connect(user2)
            .swap(await simplestToken.getAddress(), amountIn, minOutput)
        ).to.not.be.reverted;
      });

      it('should handle 5% slippage tolerance correctly', async () => {
        const { ammPool, simplestToken, user2 } = await loadFixture(
          deployPoolWithLiquidityFixture,
        );

        const amountIn = ethers.parseEther('0.1');
        const expectedOutput = await ammPool.getSwapOutput(
          await simplestToken.getAddress(), 
          amountIn
        );
        
        // 5% slippage tolerance
        const minOutput = (expectedOutput * 95n) / 100n;

        await simplestToken
          .connect(user2)
          .approve(await ammPool.getAddress(), amountIn);

        await expect(
          ammPool
            .connect(user2)
            .swap(await simplestToken.getAddress(), amountIn, minOutput)
        ).to.not.be.reverted;
      });

      it('should reject swaps when minimum output exceeds expected output', async () => {
        const { ammPool, simplestToken, user2 } = await loadFixture(
          deployPoolWithLiquidityFixture,
        );

        const amountIn = ethers.parseEther('0.1');
        const expectedOutput = await ammPool.getSwapOutput(
          await simplestToken.getAddress(), 
          amountIn
        );
        
        // Set minimum output slightly higher than expected to force slippage failure
        const minOutput = expectedOutput + 1n; // Even 1 wei more should cause failure

        await simplestToken
          .connect(user2)
          .approve(await ammPool.getAddress(), amountIn);

        // This should fail due to slippage protection
        await expect(
          ammPool
            .connect(user2)
            .swap(await simplestToken.getAddress(), amountIn, minOutput)
        ).to.be.revertedWithCustomError(ammPool, 'InsufficientOutput');
      });
    });

    describe('Error Handling', () => {
      it('should define InsufficientOutput error', async () => {
        const { ammPool } = await loadFixture(deployPoolFixture);
        
        // Error should be defined in the contract
        const errorExists = () => ammPool.interface.getError('InsufficientOutput');
        expect(errorExists).to.not.throw();
      });

      it('should use InsufficientOutput error for slippage protection', async () => {
        const { ammPool } = await loadFixture(deployPoolFixture);
        
        // InsufficientOutput error should be defined for slippage protection
        const errorExists = () => ammPool.interface.getError('InsufficientOutput');
        expect(errorExists).to.not.throw();
      });
    });
  });
});
