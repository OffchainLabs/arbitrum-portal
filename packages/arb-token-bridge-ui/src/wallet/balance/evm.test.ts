import { BigNumber } from 'ethers';
import { zeroAddress } from 'viem';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchEvmBalance } from './evm';

const mocks = vi.hoisted(() => ({
  getProviderForChainId: vi.fn(),
  fromProvider: vi.fn(),
  getTokenData: vi.fn(),
  createMultiCaller: vi.fn(),
}));

vi.mock('@arbitrum/sdk', () => ({
  MultiCaller: class {
    static fromProvider = mocks.fromProvider;
    getTokenData = mocks.getTokenData;
    constructor(provider: unknown, address: string) {
      mocks.createMultiCaller(provider, address);
    }
  },
}));
vi.mock('../../token-bridge-sdk/utils', () => ({
  getProviderForChainId: mocks.getProviderForChainId,
}));

const walletAddress = '0x9481ef9e2ca814fc94676dea3e8c3097b06b3a33';
const tokenAddress = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
const missingTokenAddress = '0x1111111111111111111111111111111111111111';
const getBalance = vi.fn();
const getTokenData = mocks.getTokenData;

describe.sequential('fetchEvmBalance', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.getProviderForChainId.mockReturnValue({ getBalance });
    mocks.fromProvider.mockResolvedValue({ getTokenData });
    getBalance.mockResolvedValue(BigNumber.from(42));
    getTokenData.mockResolvedValue([{ balance: BigNumber.from(7) }, undefined]);
  });

  it('fetches native and ERC-20 balances in one operation', async () => {
    const balances = await fetchEvmBalance({
      chainId: 1,
      walletAddress,
      tokenAddresses: [zeroAddress, tokenAddress, missingTokenAddress],
    });

    expect(balances).toEqual({
      [zeroAddress]: 42n,
      [tokenAddress]: 7n,
      [missingTokenAddress]: 0n,
    });
    expect(getBalance).toHaveBeenCalledWith(walletAddress);
    expect(getTokenData).toHaveBeenCalledWith([tokenAddress, missingTokenAddress], {
      balanceOf: { account: walletAddress },
    });
  });

  it('fetches Superposition token and native balances without a canonical bridge registration', async () => {
    const balances = await fetchEvmBalance({
      chainId: 55244,
      walletAddress,
      tokenAddresses: [zeroAddress, tokenAddress],
    });
    expect(balances).toEqual({ [zeroAddress]: 42n, [tokenAddress]: 7n });
    expect(mocks.fromProvider).not.toHaveBeenCalled();
    expect(mocks.createMultiCaller).toHaveBeenCalledWith(
      expect.anything(),
      '0xcA11bde05977b3631167028862bE2a173976CA11',
    );
  });

  it('rejects an invalid EVM wallet address', async () => {
    await expect(
      fetchEvmBalance({ chainId: 1, walletAddress: 'not-an-address', tokenAddresses: [] }),
    ).rejects.toThrow('Invalid EVM wallet address.');
    expect(mocks.getProviderForChainId).not.toHaveBeenCalled();
  });
});
