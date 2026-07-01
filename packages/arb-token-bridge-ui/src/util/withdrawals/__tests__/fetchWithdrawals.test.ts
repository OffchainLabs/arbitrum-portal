import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ChainId } from '../../../types/ChainId';
import { getNonce } from '../../AddressUtils';
import { fetchLatestIndexedBlockNumber } from '../../SubgraphUtils';
import { isAlchemyChain, isNetwork } from '../../networks';
import { fetchETHWithdrawalsFromEventLogs } from '../fetchETHWithdrawalsFromEventLogs';
import { fetchTokenWithdrawalsFromEventLogsSequentially } from '../fetchTokenWithdrawalsFromEventLogsSequentially';
import { fetchWithdrawals } from '../fetchWithdrawals';
import { fetchWithdrawalsFromSubgraph } from '../fetchWithdrawalsFromSubgraph';

vi.mock('../../SubgraphUtils', () => ({
  fetchLatestIndexedBlockNumber: vi.fn(),
}));

vi.mock('../fetchWithdrawalsFromSubgraph', () => ({
  fetchWithdrawalsFromSubgraph: vi.fn(),
}));

vi.mock('../fetchETHWithdrawalsFromEventLogs', () => ({
  fetchETHWithdrawalsFromEventLogs: vi.fn(),
}));

vi.mock('../fetchTokenWithdrawalsFromEventLogsSequentially', () => ({
  fetchTokenWithdrawalsFromEventLogsSequentially: vi.fn(),
}));

vi.mock('../fetchL2Gateways', () => ({
  fetchL2Gateways: vi.fn(() => Promise.resolve([])),
}));

vi.mock('../../AddressUtils', () => ({
  getNonce: vi.fn(),
}));

vi.mock(import('../../networks'), async (importOriginal) => ({
  ...(await importOriginal()),
  isAlchemyChain: vi.fn(),
  isNetwork: vi.fn(),
}));

vi.mock('../../ExponentialBackoffUtils', () => ({
  backOff: vi.fn((fn: () => unknown) => fn()),
  wait: vi.fn(() => Promise.resolve()),
}));

const fetchLatestIndexedBlockNumberMock = vi.mocked(fetchLatestIndexedBlockNumber);
const fetchWithdrawalsFromSubgraphMock = vi.mocked(fetchWithdrawalsFromSubgraph);
const fetchTokenWithdrawalsFromEventLogsSequentiallyMock = vi.mocked(
  fetchTokenWithdrawalsFromEventLogsSequentially,
);
const fetchETHWithdrawalsFromEventLogsMock = vi.mocked(fetchETHWithdrawalsFromEventLogs);
const getNonceMock = vi.mocked(getNonce);
const isNetworkMock = vi.mocked(isNetwork);
const isAlchemyChainMock = vi.mocked(isAlchemyChain);

const HEAD = 1000;
const FROM_BLOCK = 100;

const l2Provider = {
  getNetwork: () => Promise.resolve({ chainId: ChainId.ArbitrumOne }),
  getBlockNumber: () => Promise.resolve(HEAD),
} as never;

const baseParams = {
  sender: '0x0000000000000000000000000000000000000abc',
  parentChainId: ChainId.Ethereum,
  l2Provider,
  fromBlock: FROM_BLOCK,
};

describe.sequential('fetchWithdrawals', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    fetchLatestIndexedBlockNumberMock.mockResolvedValue(0);
    fetchWithdrawalsFromSubgraphMock.mockResolvedValue([]);
    fetchTokenWithdrawalsFromEventLogsSequentiallyMock.mockResolvedValue([]);
    fetchETHWithdrawalsFromEventLogsMock.mockResolvedValue([]);
    getNonceMock.mockResolvedValue(1);
    isNetworkMock.mockReturnValue({ isCoreChain: true, isOrbitChain: false } as never);
    isAlchemyChainMock.mockReturnValue(false);
  });

  describe('indexed/subgraph boundary', () => {
    it('caps the indexed source at the latest indexed block and scans event logs above it', async () => {
      // an indexer- or subgraph-backed chain reports how far it has indexed
      const LAST_INDEXED_BLOCK = 500;
      fetchLatestIndexedBlockNumberMock.mockResolvedValue(LAST_INDEXED_BLOCK);

      await fetchWithdrawals(baseParams);

      // the indexed source (resolved as indexer or subgraph by the API route) is bounded by the indexed head
      expect(fetchWithdrawalsFromSubgraphMock).toHaveBeenCalledWith(
        expect.objectContaining({ fromBlock: FROM_BLOCK, toBlock: LAST_INDEXED_BLOCK }),
      );
      // event logs only cover the not-yet-indexed tail
      expect(fetchTokenWithdrawalsFromEventLogsSequentiallyMock).toHaveBeenCalledWith(
        expect.objectContaining({ fromBlock: LAST_INDEXED_BLOCK + 1 }),
      );
    });

    it('caps the boundary at the provided toBlock when the indexer is further ahead', async () => {
      // indexer is ahead of the requested toBlock, so the boundary is clamped to toBlock
      fetchLatestIndexedBlockNumberMock.mockResolvedValue(900);

      await fetchWithdrawals({ ...baseParams, toBlock: 400 });

      expect(fetchWithdrawalsFromSubgraphMock).toHaveBeenCalledWith(
        expect.objectContaining({ fromBlock: FROM_BLOCK, toBlock: 400 }),
      );
    });

    it('never lets the boundary precede fromBlock when the indexer lags behind a batched fromBlock', async () => {
      // fetchWithdrawalsInBatches can request a high fromBlock while the indexer is still behind it
      fetchLatestIndexedBlockNumberMock.mockResolvedValue(500);

      await fetchWithdrawals({ ...baseParams, fromBlock: 600 });

      // the boundary is clamped to fromBlock, so the indexed range stays empty...
      expect(fetchWithdrawalsFromSubgraphMock).toHaveBeenCalledWith(
        expect.objectContaining({ fromBlock: 600, toBlock: 600 }),
      );
      // ...and event logs never scan below the requested fromBlock
      expect(fetchTokenWithdrawalsFromEventLogsSequentiallyMock).toHaveBeenCalledWith(
        expect.objectContaining({ fromBlock: 601 }),
      );
    });

    it('scans the full range via event logs when nothing is indexed yet', async () => {
      // 0 == no indexer/subgraph coverage (down, or chain not indexed)
      fetchLatestIndexedBlockNumberMock.mockResolvedValue(0);

      await fetchWithdrawals(baseParams);

      // the indexed source is asked for an empty range and contributes nothing
      expect(fetchWithdrawalsFromSubgraphMock).toHaveBeenCalledWith(
        expect.objectContaining({ fromBlock: FROM_BLOCK, toBlock: FROM_BLOCK }),
      );
      // event logs cover everything from the original fromBlock
      expect(fetchTokenWithdrawalsFromEventLogsSequentiallyMock).toHaveBeenCalledWith(
        expect.objectContaining({ fromBlock: FROM_BLOCK + 1 }),
      );
    });
  });

  describe('merging sources', () => {
    it('merges indexed-source withdrawals with event-log withdrawals and tags each source', async () => {
      fetchLatestIndexedBlockNumberMock.mockResolvedValue(500);
      fetchWithdrawalsFromSubgraphMock.mockResolvedValue([{ l2TxHash: '0x01' } as never]);
      fetchETHWithdrawalsFromEventLogsMock.mockResolvedValue([{ l2TxHash: '0x02' } as never]);

      const result = await fetchWithdrawals(baseParams);

      const sources = result.map((tx) => tx.source);
      expect(sources).toContain('subgraph');
      expect(sources).toContain('event_logs');

      const indexed = result.find((tx) => tx.source === 'subgraph');
      expect(indexed).toMatchObject({
        direction: 'withdrawal',
        childChainId: ChainId.ArbitrumOne,
        parentChainId: ChainId.Ethereum,
      });
    });
  });

  describe('resilience', () => {
    it('falls back to a full event-log scan when the indexed fetch fails', async () => {
      fetchLatestIndexedBlockNumberMock.mockResolvedValue(500);
      fetchWithdrawalsFromSubgraphMock.mockRejectedValue(new Error('indexer down'));

      await fetchWithdrawals(baseParams);

      // the indexed range was not fetched, so event logs must cover from the original fromBlock
      expect(fetchTokenWithdrawalsFromEventLogsSequentiallyMock).toHaveBeenCalledWith(
        expect.objectContaining({ fromBlock: FROM_BLOCK + 1 }),
      );
    });
  });
});
