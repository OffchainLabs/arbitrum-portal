import { afterEach, describe, expect, it, vi } from 'vitest';

import { ChainId } from '../../types/ChainId';

async function importFetchersWithIndexedChainsStubbed(indexedChainIds: string) {
  vi.resetModules();
  vi.stubEnv('NEXT_PUBLIC_INDEXER_CHILD_CHAIN_IDS', indexedChainIds);

  const [deposits, customDestination, withdrawals] = await Promise.all([
    import('../deposits/fetchDepositsFromSubgraph'),
    import('../deposits/fetchEthDepositsToCustomDestinationFromSubgraph'),
    import('../withdrawals/fetchWithdrawalsFromSubgraph'),
  ]);

  return [
    ['fetchDepositsFromSubgraph', deposits.fetchDepositsFromSubgraph],
    [
      'fetchEthDepositsToCustomDestinationFromSubgraph',
      customDestination.fetchEthDepositsToCustomDestinationFromSubgraph,
    ],
    ['fetchWithdrawalsFromSubgraph', withdrawals.fetchWithdrawalsFromSubgraph],
  ] as const;
}

function query(l2ChainId: number) {
  return {
    sender: '0x1234567890123456789012345678901234567890',
    fromBlock: 0,
    toBlock: 1_000_000,
    l2ChainId,
    pageSize: 10,
    pageNumber: 0,
  };
}

describe.sequential('bridge history availability', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  // Arbitrum One no longer qualifies: it is always served by the indexer.
  it('resolves empty without a request for ApeChain, with no indexer entry', async () => {
    const l2ChainId = ChainId.ApeChain;
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const fetchers = await importFetchersWithIndexedChainsStubbed('46630');

    await Promise.all(
      fetchers.map(([name, fetchHistory]) =>
        expect(fetchHistory(query(l2ChainId)), name).resolves.toEqual([]),
      ),
    );

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    ['a chain the indexer serves', 46630],
    ['Nova, a default even when unlisted', ChainId.ArbitrumNova],
  ])('requests history for %s', async (_label, l2ChainId) => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, status: 200, json: async () => ({ data: [] }) });
    vi.stubGlobal('fetch', fetchMock);
    const fetchers = await importFetchersWithIndexedChainsStubbed('46630');

    await Promise.all(
      fetchers.map(([name, fetchHistory]) =>
        expect(fetchHistory(query(l2ChainId)), name).resolves.toEqual([]),
      ),
    );

    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
