import { BigNumber } from 'ethers';
import { zeroAddress } from 'viem';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ChainId } from '../../types/ChainId';
import { fetchEvmBalance } from './evm';

const mocks = vi.hoisted(() => ({
  getProviderForChainId: vi.fn(),
  fromProvider: vi.fn(),
  MultiCaller: vi.fn(),
  captureSentryErrorWithExtraData: vi.fn(),
}));

vi.mock('@arbitrum/sdk', () => ({
  MultiCaller: Object.assign(mocks.MultiCaller, { fromProvider: mocks.fromProvider }),
}));
vi.mock('../../token-bridge-sdk/utils', () => ({
  getProviderForChainId: mocks.getProviderForChainId,
}));
vi.mock('../../util/SentryUtils', () => ({
  captureSentryErrorWithExtraData: mocks.captureSentryErrorWithExtraData,
}));

const walletAddress = '0x9481ef9e2ca814fc94676dea3e8c3097b06b3a33';
const tokenAddress = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
const missingTokenAddress = '0x1111111111111111111111111111111111111111';
const getBalance = vi.fn();
const getTokenData = vi.fn();

describe.sequential('fetchEvmBalance', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.getProviderForChainId.mockReturnValue({ getBalance });
    mocks.fromProvider.mockResolvedValue({ getTokenData });
    mocks.MultiCaller.mockImplementation(function () {
      return { getTokenData };
    });
    getBalance.mockResolvedValue(BigNumber.from(42));
    getTokenData.mockResolvedValue([{ balance: BigNumber.from(7) }, undefined]);
  });

  it('fetches native and ERC-20 balances in one operation, leaving failed balanceOf calls out', async () => {
    const balances = await fetchEvmBalance({
      chainId: 1,
      walletAddress,
      tokenAddresses: [zeroAddress, tokenAddress, missingTokenAddress],
    });

    expect(balances).toEqual({
      [zeroAddress]: 42n,
      [tokenAddress]: 7n,
    });
    expect(getBalance).toHaveBeenCalledWith(walletAddress);
    expect(getTokenData).toHaveBeenCalledWith([tokenAddress, missingTokenAddress], {
      balanceOf: { account: walletAddress },
    });
  });

  it('reads Elysium ERC-20 balances through its Multicall3 contract', async () => {
    const balances = await fetchEvmBalance({
      chainId: ChainId.Elysium,
      walletAddress,
      tokenAddresses: [tokenAddress],
    });

    expect(balances).toEqual({ [tokenAddress]: 7n });
    expect(mocks.MultiCaller).toHaveBeenCalledWith(
      { getBalance },
      '0xcA11bde05977b3631167028862bE2a173976CA11',
    );
    expect(mocks.fromProvider).not.toHaveBeenCalled();
  });

  it('reports a multicall failure and still returns the native balance', async () => {
    const error = new Error('multicall failed');
    getTokenData.mockRejectedValue(error);

    const balances = await fetchEvmBalance({
      chainId: 1,
      walletAddress,
      tokenAddresses: [zeroAddress, tokenAddress],
    });

    expect(balances).toEqual({ [zeroAddress]: 42n });
    expect(mocks.captureSentryErrorWithExtraData).toHaveBeenCalledWith(
      expect.objectContaining({ error, originFunction: 'fetchEvmBalance' }),
    );
  });

  it('rejects an invalid EVM wallet address', async () => {
    await expect(
      fetchEvmBalance({ chainId: 1, walletAddress: 'not-an-address', tokenAddresses: [] }),
    ).rejects.toThrow('Invalid EVM wallet address.');
    expect(mocks.getProviderForChainId).not.toHaveBeenCalled();
  });
});
