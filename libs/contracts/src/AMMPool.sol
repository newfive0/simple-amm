// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";

error InvalidAmounts();
error InsufficientLiquidity();
error InvalidAmount();
error UnsupportedToken();

contract AMMPool {
    IERC20 public tokenA;
    IERC20 public tokenB;
    uint256 public reserveA;
    uint256 public reserveB;
    uint256 public totalLiquidity;
    mapping(address => uint256) public liquidity;

    event LiquidityAdded(address indexed provider, uint256 amountA, uint256 amountB, uint256 liquidity);
    event LiquidityRemoved(address indexed provider, uint256 amountA, uint256 amountB, uint256 liquidity);
    event Swap(address indexed user, address tokenIn, uint256 amountIn, uint256 amountOut);

    constructor(address _tokenA, address _tokenB) {
        tokenA = IERC20(_tokenA);
        tokenB = IERC20(_tokenB);
    }

    function addLiquidity(uint256 amountA, uint256 amountB) external returns (uint256 liquidityShare) {
        // TODO: Slippage protection
        if (amountA <= 0 || amountB <= 0) revert InvalidAmounts();

        tokenA.transferFrom(msg.sender, address(this), amountA);
        tokenB.transferFrom(msg.sender, address(this), amountB);

        if (totalLiquidity == 0) {
            liquidityShare = Math.sqrt(amountA * amountB);
        } else {
            liquidityShare = min((amountA * totalLiquidity) / reserveA, (amountB * totalLiquidity) / reserveB);
        }

        liquidity[msg.sender] += liquidityShare;
        totalLiquidity += liquidityShare;
        reserveA += amountA;
        reserveB += amountB;

        emit LiquidityAdded(msg.sender, amountA, amountB, liquidityShare);
    }

    function removeLiquidity(uint256 liquidityShare) external returns (uint256 amountA, uint256 amountB) {
        // TODO: Slippage protection
        if (liquidityShare <= 0 || liquidity[msg.sender] < liquidityShare) revert InsufficientLiquidity();

        amountA = (liquidityShare * reserveA) / totalLiquidity;
        amountB = (liquidityShare * reserveB) / totalLiquidity;

        liquidity[msg.sender] -= liquidityShare;
        totalLiquidity -= liquidityShare;
        reserveA -= amountA;
        reserveB -= amountB;

        tokenA.transfer(msg.sender, amountA);
        tokenB.transfer(msg.sender, amountB);

        emit LiquidityRemoved(msg.sender, amountA, amountB, liquidityShare);
    }

    function swap(address tokenIn, uint256 amountIn) external returns (uint256 amountOut) {
        // TODO: Slippage protection
        if (amountIn <= 0) revert InvalidAmount();

        bool isTokenA = tokenIn == address(tokenA);
        if (!isTokenA && tokenIn != address(tokenB)) revert UnsupportedToken();

        (IERC20 tokenInContract, IERC20 tokenOutContract, uint256 reserveIn, uint256 reserveOut) = isTokenA
            ? (tokenA, tokenB, reserveA, reserveB)
            : (tokenB, tokenA, reserveB, reserveA);

        tokenInContract.transferFrom(msg.sender, address(this), amountIn);

        // 0.3% fee
        uint256 amountInWithFee = (amountIn * 997) / 1000;
        amountOut = (reserveOut * amountInWithFee) / (reserveIn + amountInWithFee);

        if (isTokenA) {
            reserveA += amountIn;
            reserveB -= amountOut;
        } else {
            reserveB += amountIn;
            reserveA -= amountOut;
        }

        tokenOutContract.transfer(msg.sender, amountOut);

        emit Swap(msg.sender, tokenIn, amountIn, amountOut);
    }

    function min(uint256 a, uint256 b) private pure returns (uint256) {
        return a < b ? a : b;
    }
}
