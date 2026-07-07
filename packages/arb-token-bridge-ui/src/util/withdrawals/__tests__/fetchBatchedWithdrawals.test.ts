import { StaticJsonRpcProvider } from '@ethersproject/providers';
import { describe, expect, it, vi } from 'vitest';

import { fetchWithdrawalsInBatches } from '../../../hooks/useTransactionHistory';
import * as addressUtils from '../../AddressUtils';
import { initializeBridgeNetworks } from '../../networks';
import * as fetchModule from '../fetchWithdrawals';
import { getQueryCoveringClassicAndNitroWithResults } from './fetchWithdrawalsTestHelpers';

const validResult = [
  expect.objectContaining({
    l2TxHash: '0x42d860059e8f9ec897348590fc34ad48ca0daba965071a6348f2ddc9dd2132d3',
  }),
  expect.objectContaining({
    l2TxHash: '0x7eba6d30f86f39917959c55604f661f429142139473e9eaec332d65c507cb215',
  }),
  expect.objectContaining({
    l2TxHash: '0xcf38b3fe57a4d823d0dd4b4ba3792f51640a4575f7da8fb582e5006bf60bceb3',
  }),
  expect.objectContaining({
    l2TxHash: '0xbd809fa3ad466a5a88628f3f0f9fc92df4ab9d9b1bd6b3861cd87cb464a9a7c3',
  }),
];

describe.sequential('fetchWithdrawalsInBatches multiple calls', () => {
  it('calls fetchWithdrawals correct number of times and returns valid data', async () => {
    const mock = vi
      .spyOn(fetchModule, 'fetchWithdrawals')
      .mockResolvedValueOnce(validResult.slice(0, 2) as any)
      .mockResolvedValueOnce(validResult.slice(2, 3) as any)
      .mockResolvedValueOnce(validResult.slice(3) as any);

    const result = await fetchWithdrawalsInBatches({
      parentChainId: 1,
      ...getQueryCoveringClassicAndNitroWithResults(),
      batchSizeBlocks: 5_000_000,
    });

    expect(mock).toHaveBeenCalledTimes(3);
    expect(result).toHaveLength(4);
    expect(result).toEqual(expect.arrayContaining(validResult));

    mock.mockRestore();
  });
});

describe.sequential('fetchWithdrawalsInBatches single call', () => {
  it('calls a large range once and returns valid data', async () => {
    const mock = vi.spyOn(fetchModule, 'fetchWithdrawals').mockResolvedValue(validResult as any);

    const result = await fetchWithdrawalsInBatches({
      parentChainId: 1,
      ...getQueryCoveringClassicAndNitroWithResults(),
      batchSizeBlocks: 100_000_000,
    });

    expect(mock).toHaveBeenCalledTimes(1);
    expect(result).toHaveLength(4);
    expect(result).toEqual(expect.arrayContaining(validResult));

    mock.mockRestore();
  });
});

describe.sequential(
  'fetchWithdrawalsInBatches throw error when toBlock lower than fromBlock',
  () => {
    it('throws an error', async () => {
      await expect(
        fetchWithdrawalsInBatches({
          parentChainId: 1,
          ...getQueryCoveringClassicAndNitroWithResults(),
          batchSizeBlocks: 1,
          fromBlock: 2,
          toBlock: 1,
        }),
      ).rejects.toThrow('toBlock (1) cannot be lower than fromBlock (2)');
    });
  },
);

describe.sequential('fetchWithdrawalsInBatches binary-search optimization on Orbit chains', () => {
  // Register JASMY/T-REX as Orbit chains for isNetwork().isOrbitChain checks
  initializeBridgeNetworks();

  const SENDER = '0x2Ce910fBba65B454bBAf6A18c952A70f3bcd8299';
  const JASMY_CHAIN_ID = 680;
  const TREX_CHAIN_ID = 1628;

  function createMockProvider({
    chainId,
    latestBlock,
    firstNonZeroBlock,
    failHistoricalLookup = false,
  }: {
    chainId: number;
    latestBlock: number;
    firstNonZeroBlock?: number;
    failHistoricalLookup?: boolean;
  }) {
    const provider = new StaticJsonRpcProvider('http://test.invalid', {
      name: 'mock',
      chainId,
    });
    provider.getBlockNumber = vi.fn().mockResolvedValue(latestBlock);
    provider.getTransactionCount = vi
      .fn()
      .mockImplementation((_address: string, blockTag?: number | string) => {
        // Initial nonce lookup (no block tag) — used by the senderNonce > 0 gate
        if (typeof blockTag === 'undefined') {
          return Promise.resolve(5);
        }
        // Historical lookups — used by the binary search
        if (failHistoricalLookup) {
          return Promise.reject(new Error('historical state not supported'));
        }
        const block = typeof blockTag === 'number' ? blockTag : latestBlock;
        return Promise.resolve(block >= (firstNonZeroBlock ?? 0) ? 1 : 0);
      });
    return provider;
  }

  it('sets fromBlock to firstBlock - 1 for self-withdrawals when batch size is small', async () => {
    const latestBlock = 60_000_000;
    const firstNonZeroBlock = 50_000_000;
    const provider = createMockProvider({
      chainId: JASMY_CHAIN_ID,
      latestBlock,
      firstNonZeroBlock,
    });
    const searchSpy = vi.spyOn(addressUtils, 'findFirstBlockWithNonce');
    searchSpy.mockClear();
    const fetchSpy = vi.spyOn(fetchModule, 'fetchWithdrawals').mockResolvedValue([]);
    fetchSpy.mockClear();

    await fetchWithdrawalsInBatches({
      sender: SENDER,
      receiver: SENDER,
      parentChainId: 1,
      l2Provider: provider,
      batchSizeBlocks: 10_000,
      pageSize: 1000,
    });

    expect(searchSpy).toHaveBeenCalledOnce();
    expect(fetchSpy).toHaveBeenCalled();
    expect(fetchSpy.mock.calls[0]?.[0].fromBlock).toBe(firstNonZeroBlock - 1);

    searchSpy.mockRestore();
    fetchSpy.mockRestore();
  });

  it('falls back to the default fromBlock when historical nonce lookup throws', async () => {
    const latestBlock = 100_000;
    const provider = createMockProvider({
      chainId: TREX_CHAIN_ID,
      latestBlock,
      failHistoricalLookup: true,
    });
    const searchSpy = vi.spyOn(addressUtils, 'findFirstBlockWithNonce');
    searchSpy.mockClear();
    const fetchSpy = vi.spyOn(fetchModule, 'fetchWithdrawals').mockResolvedValue([]);
    fetchSpy.mockClear();

    await fetchWithdrawalsInBatches({
      sender: SENDER,
      receiver: SENDER,
      parentChainId: 1,
      l2Provider: provider,
      batchSizeBlocks: 10_000,
      pageSize: 1000,
    });

    expect(searchSpy).toHaveBeenCalled();
    await expect(searchSpy.mock.results[0]?.value).resolves.toBe(0);
    expect(fetchSpy.mock.calls[0]?.[0].fromBlock).toBe(1);

    searchSpy.mockRestore();
    fetchSpy.mockRestore();
  });

  it('skips the binary search when batch size is above the threshold (e.g. ApeChain)', async () => {
    const latestBlock = 38_000_000;
    const provider = createMockProvider({
      chainId: JASMY_CHAIN_ID,
      latestBlock,
      firstNonZeroBlock: 30_000_000,
    });
    const searchSpy = vi.spyOn(addressUtils, 'findFirstBlockWithNonce');
    searchSpy.mockClear();
    const fetchSpy = vi.spyOn(fetchModule, 'fetchWithdrawals').mockResolvedValue([]);
    fetchSpy.mockClear();

    await fetchWithdrawalsInBatches({
      sender: SENDER,
      receiver: SENDER,
      parentChainId: 1,
      l2Provider: provider,
      batchSizeBlocks: 5_000_000,
      pageSize: 1000,
    });

    expect(searchSpy).not.toHaveBeenCalled();
    expect(fetchSpy.mock.calls[0]?.[0].fromBlock).toBe(1);

    searchSpy.mockRestore();
    fetchSpy.mockRestore();
  });

  it('applies the binary search when receiver is undefined (SCW connected to child chain)', async () => {
    const latestBlock = 60_000_000;
    const firstNonZeroBlock = 50_000_000;
    const provider = createMockProvider({
      chainId: JASMY_CHAIN_ID,
      latestBlock,
      firstNonZeroBlock,
    });
    const searchSpy = vi.spyOn(addressUtils, 'findFirstBlockWithNonce');
    searchSpy.mockClear();
    const fetchSpy = vi.spyOn(fetchModule, 'fetchWithdrawals').mockResolvedValue([]);
    fetchSpy.mockClear();

    await fetchWithdrawalsInBatches({
      sender: SENDER,
      receiver: undefined,
      parentChainId: 1,
      l2Provider: provider,
      batchSizeBlocks: 10_000,
      pageSize: 1000,
    });

    expect(searchSpy).toHaveBeenCalledOnce();
    expect(fetchSpy.mock.calls[0]?.[0].fromBlock).toBe(firstNonZeroBlock - 1);

    searchSpy.mockRestore();
    fetchSpy.mockRestore();
  });

  it('skips the binary search when sender !== receiver', async () => {
    const provider = createMockProvider({
      chainId: JASMY_CHAIN_ID,
      latestBlock: 60_000_000,
      firstNonZeroBlock: 50_000_000,
    });
    const searchSpy = vi.spyOn(addressUtils, 'findFirstBlockWithNonce');
    searchSpy.mockClear();
    const fetchSpy = vi.spyOn(fetchModule, 'fetchWithdrawals').mockResolvedValue([]);
    fetchSpy.mockClear();

    await fetchWithdrawalsInBatches({
      sender: SENDER,
      receiver: '0x1111111111111111111111111111111111111111',
      parentChainId: 1,
      l2Provider: provider,
      batchSizeBlocks: 10_000,
      pageSize: 1000,
    });

    expect(searchSpy).not.toHaveBeenCalled();
    expect(fetchSpy.mock.calls[0]?.[0].fromBlock).toBe(1);

    searchSpy.mockRestore();
    fetchSpy.mockRestore();
  });

  it('skips the binary search and the senderNonce gate when forceFetchReceived is true', async () => {
    const provider = createMockProvider({
      chainId: JASMY_CHAIN_ID,
      latestBlock: 60_000_000,
      firstNonZeroBlock: 50_000_000,
    });
    const searchSpy = vi.spyOn(addressUtils, 'findFirstBlockWithNonce');
    searchSpy.mockClear();
    const fetchSpy = vi.spyOn(fetchModule, 'fetchWithdrawals').mockResolvedValue([]);
    fetchSpy.mockClear();

    await fetchWithdrawalsInBatches({
      sender: SENDER,
      receiver: SENDER,
      parentChainId: 1,
      l2Provider: provider,
      batchSizeBlocks: 10_000,
      pageSize: 1000,
      forceFetchReceived: true,
    });

    expect(searchSpy).not.toHaveBeenCalled();
    expect(fetchSpy.mock.calls[0]?.[0].fromBlock).toBe(1);

    searchSpy.mockRestore();
    fetchSpy.mockRestore();
  });
});
