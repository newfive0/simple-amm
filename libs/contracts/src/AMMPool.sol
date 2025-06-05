// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";

error InsufficientLiquidity();
error InvalidAmount();
error UnsupportedToken();
error InsufficientETHReserve();
error InsufficientTokenReserve();

contract AMMPool {
    IERC20 public simplestToken;
    uint256 public reserveSimplest;
    uint256 public reserveETH;
    uint256 public totalLiquidity;
    mapping(address => uint256) public liquidity;

    event LiquidityAdded(address indexed provider, uint256 amountSimplest, uint256 amountETH, uint256 liquidity);
    event LiquidityRemoved(address indexed provider, uint256 amountSimplest, uint256 amountETH, uint256 liquidity);
    event Swap(address indexed user, address tokenIn, uint256 amountIn, uint256 amountOut);

    constructor(address _simplestToken) {
        simplestToken = IERC20(_simplestToken);
    }

    function addLiquidity(uint256 amountSimplest) external payable returns (uint256 liquidityShare) {
        // TODO: Slippage protection
        if (amountSimplest <= 0 || msg.value <= 0) revert InvalidAmount();

        simplestToken.transferFrom(msg.sender, address(this), amountSimplest);

        if (totalLiquidity == 0) {
            liquidityShare = Math.sqrt(amountSimplest * msg.value);
        } else {
            liquidityShare = min(
                (amountSimplest * totalLiquidity) / reserveSimplest,
                (msg.value * totalLiquidity) / reserveETH
            );
        }

        liquidity[msg.sender] += liquidityShare;
        totalLiquidity += liquidityShare;
        reserveSimplest += amountSimplest;
        reserveETH += msg.value;

        emit LiquidityAdded(msg.sender, amountSimplest, msg.value, liquidityShare);
    }

    function removeLiquidity(uint256 liquidityShare) external returns (uint256 amountSimplest, uint256 amountETH) {
        // TODO: Slippage protection
        if (liquidityShare <= 0 || liquidity[msg.sender] < liquidityShare) revert InsufficientLiquidity();

        amountSimplest = (liquidityShare * reserveSimplest) / totalLiquidity;
        amountETH = (liquidityShare * reserveETH) / totalLiquidity;

        liquidity[msg.sender] -= liquidityShare;
        totalLiquidity -= liquidityShare;
        reserveSimplest -= amountSimplest;
        reserveETH -= amountETH;

        simplestToken.transfer(msg.sender, amountSimplest);
        payable(msg.sender).transfer(amountETH);

        emit LiquidityRemoved(msg.sender, amountSimplest, amountETH, liquidityShare);
    }

    function swap(address tokenIn, uint256 amountIn) external payable returns (uint256 amountOut) {
        // TODO: Slippage protection
        if (tokenIn == address(simplestToken) && amountIn <= 0) revert InvalidAmount();
        if (tokenIn == address(0) && msg.value <= 0) revert InvalidAmount();

        bool isSimplestToken = tokenIn == address(simplestToken);
        if (!isSimplestToken && tokenIn != address(0)) revert UnsupportedToken();

        if (isSimplestToken) {
            uint256 amountInWithFee = (amountIn * 997) / 1000;
            amountOut = (reserveETH * amountInWithFee) / (reserveSimplest + amountInWithFee);

            if (amountOut > reserveETH) revert InsufficientETHReserve();

            _swapSimplestForETH(amountIn, amountOut);
        } else {
            uint256 amountInWithFee = (msg.value * 997) / 1000;
            amountOut = (reserveSimplest * amountInWithFee) / (reserveETH + amountInWithFee);

            if (amountOut > reserveSimplest) revert InsufficientTokenReserve();

            _swapETHForSimplest(amountOut);
        }

        emit Swap(msg.sender, tokenIn, isSimplestToken ? amountIn : msg.value, amountOut);
    }

    function _swapSimplestForETH(uint256 amountIn, uint256 amountOut) private {
        reserveSimplest += amountIn;
        reserveETH -= amountOut;

        simplestToken.transferFrom(msg.sender, address(this), amountIn);
        payable(msg.sender).transfer(amountOut);
    }

    function _swapETHForSimplest(uint256 amountOut) private {
        reserveETH += msg.value;
        reserveSimplest -= amountOut;

        simplestToken.transfer(msg.sender, amountOut);
    }

    function min(uint256 a, uint256 b) private pure returns (uint256) {
        return a < b ? a : b;
    }
}
