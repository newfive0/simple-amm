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
    uint256 public totalLPTokens;
    mapping(address => uint256) public lpTokens;

    event LiquidityAdded(address indexed provider, uint256 amountSimplest, uint256 amountETH, uint256 lpTokenAmount);
    event LiquidityRemoved(address indexed provider, uint256 amountSimplest, uint256 amountETH, uint256 lpTokenAmount);
    event Swap(address indexed user, address tokenIn, uint256 amountIn, uint256 amountOut);

    constructor(address _simplestToken) {
        simplestToken = IERC20(_simplestToken);
    }

    function addLiquidity(uint256 amountSimplest) external payable returns (uint256 lpTokenAmount) {
        // TODO: Slippage protection
        if (amountSimplest <= 0 || msg.value <= 0) revert InvalidAmount();

        simplestToken.transferFrom(msg.sender, address(this), amountSimplest);

        if (totalLPTokens == 0) {
            lpTokenAmount = Math.sqrt(amountSimplest * msg.value);
        } else {
            lpTokenAmount = min(
                (amountSimplest * totalLPTokens) / reserveSimplest,
                (msg.value * totalLPTokens) / reserveETH
            );
        }

        lpTokens[msg.sender] += lpTokenAmount;
        totalLPTokens += lpTokenAmount;
        reserveSimplest += amountSimplest;
        reserveETH += msg.value;

        emit LiquidityAdded(msg.sender, amountSimplest, msg.value, lpTokenAmount);
    }

    function removeLiquidity(uint256 lpTokenAmount) external returns (uint256 amountSimplest, uint256 amountETH) {
        // TODO: Slippage protection
        if (lpTokenAmount <= 0 || lpTokens[msg.sender] < lpTokenAmount) revert InsufficientLiquidity();

        amountSimplest = (lpTokenAmount * reserveSimplest) / totalLPTokens;
        amountETH = (lpTokenAmount * reserveETH) / totalLPTokens;

        lpTokens[msg.sender] -= lpTokenAmount;
        totalLPTokens -= lpTokenAmount;
        reserveSimplest -= amountSimplest;
        reserveETH -= amountETH;

        simplestToken.transfer(msg.sender, amountSimplest);
        payable(msg.sender).transfer(amountETH);

        emit LiquidityRemoved(msg.sender, amountSimplest, amountETH, lpTokenAmount);
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
