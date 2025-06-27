import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ethers } from 'ethers';
import { getWalletBalances, getPoolBalances, getTokenSymbol } from './balances';

// Mock the config module
vi.mock('../config', () => ({
  config: {
    contracts: {
      tokenAddress: '0x1234567890123456789012345678901234567890',
      ammPoolAddress: '0x9876543210987654321098765432109876543210',
    },
  },
}));

// Mock TypeChain factories
const mockTokenContract = {
  balanceOf: vi.fn(),
  symbol: vi.fn(),
};

const mockAmmContract = {
  reserveETH: vi.fn(),
  reserveSimplest: vi.fn(),
};

vi.mock('@typechain-types', () => ({
  Token__factory: {
    connect: vi.fn(() => mockTokenContract),
  },
  AMMPool__factory: {
    connect: vi.fn(() => mockAmmContract),
  },
}));

describe('Balance Utilities', () => {
  const mockAccount = '0x1234567890abcdef1234567890abcdef12345678';
  
  const mockEthereumProvider = {
    getBalance: vi.fn(),
  };

  const mockSigner = {
    getAddress: vi.fn().mockResolvedValue(mockAccount),
  } as unknown as ethers.JsonRpcSigner;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getWalletBalances', () => {
    it('should fetch and return wallet balances', async () => {
      // Mock return values
      mockEthereumProvider.getBalance.mockResolvedValue(BigInt(5e18)); // 5 ETH
      mockTokenContract.balanceOf.mockResolvedValue(BigInt(1000e18)); // 1000 tokens

      const result = await getWalletBalances(mockEthereumProvider as unknown as ethers.BrowserProvider, mockAccount, mockSigner);

      expect(result).toEqual({
        ethBalance: 5.0,
        tokenBalance: 1000.0,
      });

      expect(mockEthereumProvider.getBalance).toHaveBeenCalledWith(mockAccount);
      expect(mockTokenContract.balanceOf).toHaveBeenCalledWith(mockAccount);
    });

    it('should handle fractional balances correctly', async () => {
      // Mock fractional values
      mockEthereumProvider.getBalance.mockResolvedValue(BigInt(2.5e18)); // 2.5 ETH
      mockTokenContract.balanceOf.mockResolvedValue(BigInt(750e18)); // 750 tokens

      const result = await getWalletBalances(mockEthereumProvider as unknown as ethers.BrowserProvider, mockAccount, mockSigner);

      expect(result).toEqual({
        ethBalance: 2.5,
        tokenBalance: 750.0,
      });
    });

    it('should throw error when ethereum provider fails', async () => {
      mockEthereumProvider.getBalance.mockRejectedValue(new Error('Network error'));
      mockTokenContract.balanceOf.mockResolvedValue(BigInt(1000e18));

      await expect(getWalletBalances(mockEthereumProvider as unknown as ethers.BrowserProvider, mockAccount, mockSigner))
        .rejects.toThrow('Network error');
    });

    it('should throw error when token contract fails', async () => {
      mockEthereumProvider.getBalance.mockResolvedValue(BigInt(5e18));
      mockTokenContract.balanceOf.mockRejectedValue(new Error('Contract error'));

      await expect(getWalletBalances(mockEthereumProvider as unknown as ethers.BrowserProvider, mockAccount, mockSigner))
        .rejects.toThrow('Contract error');
    });
  });

  describe('getPoolBalances', () => {
    it('should fetch and return pool balances', async () => {
      // Mock return values
      mockAmmContract.reserveETH.mockResolvedValue(BigInt(10e18)); // 10 ETH
      mockAmmContract.reserveSimplest.mockResolvedValue(BigInt(20e18)); // 20 tokens

      const result = await getPoolBalances(mockSigner);

      expect(result).toEqual({
        ethReserve: 10.0,
        tokenReserve: 20.0,
      });

      expect(mockAmmContract.reserveETH).toHaveBeenCalled();
      expect(mockAmmContract.reserveSimplest).toHaveBeenCalled();
    });

    it('should handle zero reserves', async () => {
      mockAmmContract.reserveETH.mockResolvedValue(BigInt(0));
      mockAmmContract.reserveSimplest.mockResolvedValue(BigInt(0));

      const result = await getPoolBalances(mockSigner);

      expect(result).toEqual({
        ethReserve: 0.0,
        tokenReserve: 0.0,
      });
    });

    it('should handle fractional reserves', async () => {
      mockAmmContract.reserveETH.mockResolvedValue(BigInt(15.5e18)); // 15.5 ETH
      mockAmmContract.reserveSimplest.mockResolvedValue(BigInt(31.25e18)); // 31.25 tokens

      const result = await getPoolBalances(mockSigner);

      expect(result).toEqual({
        ethReserve: 15.5,
        tokenReserve: 31.25,
      });
    });

    it('should throw error when AMM contract fails', async () => {
      mockAmmContract.reserveETH.mockRejectedValue(new Error('Contract error'));
      mockAmmContract.reserveSimplest.mockResolvedValue(BigInt(20e18));

      await expect(getPoolBalances(mockSigner))
        .rejects.toThrow('Contract error');
    });
  });

  describe('getTokenSymbol', () => {
    it('should fetch and return token symbol', async () => {
      mockTokenContract.symbol.mockResolvedValue('SIMP');

      const result = await getTokenSymbol(mockSigner);

      expect(result).toBe('SIMP');
      expect(mockTokenContract.symbol).toHaveBeenCalled();
    });

    it('should handle different token symbols', async () => {
      mockTokenContract.symbol.mockResolvedValue('CUSTOM');

      const result = await getTokenSymbol(mockSigner);

      expect(result).toBe('CUSTOM');
    });

    it('should throw error when token contract fails', async () => {
      mockTokenContract.symbol.mockRejectedValue(new Error('Contract error'));

      await expect(getTokenSymbol(mockSigner))
        .rejects.toThrow('Contract error');
    });
  });

  describe('Integration scenarios', () => {
    it('should handle all functions being called in parallel', async () => {
      // Set up mocks
      mockEthereumProvider.getBalance.mockResolvedValue(BigInt(3e18));
      mockTokenContract.balanceOf.mockResolvedValue(BigInt(500e18));
      mockAmmContract.reserveETH.mockResolvedValue(BigInt(12e18));
      mockAmmContract.reserveSimplest.mockResolvedValue(BigInt(24e18));
      mockTokenContract.symbol.mockResolvedValue('TEST');

      // Call all functions in parallel
      const [walletBalances, poolBalances, tokenSymbol] = await Promise.all([
        getWalletBalances(mockEthereumProvider as unknown as ethers.BrowserProvider, mockAccount, mockSigner),
        getPoolBalances(mockSigner),
        getTokenSymbol(mockSigner),
      ]);

      expect(walletBalances).toEqual({ ethBalance: 3.0, tokenBalance: 500.0 });
      expect(poolBalances).toEqual({ ethReserve: 12.0, tokenReserve: 24.0 });
      expect(tokenSymbol).toBe('TEST');
    });

    it('should handle large numbers correctly', async () => {
      // Test with very large numbers (close to JavaScript number limits)
      const largeEthAmount = BigInt(999e18); // 999 ETH
      const largeTokenAmount = BigInt(1e24); // 1M tokens

      mockEthereumProvider.getBalance.mockResolvedValue(largeEthAmount);
      mockTokenContract.balanceOf.mockResolvedValue(largeTokenAmount);

      const result = await getWalletBalances(mockEthereumProvider as unknown as ethers.BrowserProvider, mockAccount, mockSigner);

      expect(result).toEqual({
        ethBalance: 999.0,
        tokenBalance: 1000000.0,
      });
    });
  });
});