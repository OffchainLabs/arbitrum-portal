import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ChainId } from '../../../types/ChainId';
import { fetchDeposits } from '../fetchDeposits';
import { fetchDepositsFromSubgraph } from '../fetchDepositsFromSubgraph';
import { fetchEthDepositsToCustomDestinationFromSubgraph } from '../fetchEthDepositsToCustomDestinationFromSubgraph';

vi.mock('../fetchDepositsFromSubgraph', () => ({
  fetchDepositsFromSubgraph: vi.fn(),
}));

vi.mock('../fetchEthDepositsToCustomDestinationFromSubgraph', () => ({
  fetchEthDepositsToCustomDestinationFromSubgraph: vi.fn(),
}));

// Whole module, not `importOriginal`: evaluating the real one reaches `networks`,
// which reads an RPC key at import and throws when it is unset.
vi.mock('../../../hooks/useNativeCurrency', () => ({
  fetchNativeCurrency: vi.fn(() =>
    Promise.resolve({ symbol: 'ETH', decimals: 18, isCustom: false }),
  ),
}));

const fetchDepositsFromSubgraphMock = vi.mocked(fetchDepositsFromSubgraph);
const fetchEthDepositsToCustomDestinationFromSubgraphMock = vi.mocked(
  fetchEthDepositsToCustomDestinationFromSubgraph,
);

const params = {
  sender: '0x0000000000000000000000000000000000000abc',
  l1Provider: {
    getNetwork: () => Promise.resolve({ chainId: ChainId.Ethereum }),
  } as never,
  l2Provider: {
    getNetwork: () => Promise.resolve({ chainId: ChainId.ArbitrumOne }),
  } as never,
};

describe.sequential('fetchDeposits', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchDepositsFromSubgraphMock.mockResolvedValue([]);
    fetchEthDepositsToCustomDestinationFromSubgraphMock.mockResolvedValue([]);
  });

  it('propagates a history failure instead of returning an empty list', async () => {
    fetchDepositsFromSubgraphMock.mockRejectedValue(new Error('/api/deposits failed with 502'));

    await expect(fetchDeposits(params)).rejects.toThrow('502');
  });

  it('propagates a custom-destination failure too', async () => {
    fetchEthDepositsToCustomDestinationFromSubgraphMock.mockRejectedValue(
      new Error('/api/eth-deposits-custom-destination failed with 502'),
    );

    await expect(fetchDeposits(params)).rejects.toThrow('502');
  });

  it('keeps isClassic from a custom-destination deposit', async () => {
    // Arbitrum One deposit 0x33b0099b… (L1 block 13,187,872) predates Nitro and
    // carries a child-chain call value, so the indexer serves it here as Classic.
    fetchEthDepositsToCustomDestinationFromSubgraphMock.mockResolvedValue([
      {
        receiver: '0xf56e305024b195383245a075737d16dbdb8487fb',
        sender: '0xf56e305024b195383245a075737d16dbdb8487fb',
        timestamp: '1631140849',
        transactionHash: '0x33b0099be1547100c6eb4e9de38aab164cf82990c80fe8b427d571926ffd294d',
        type: 'EthDeposit',
        isClassic: true,
        id: '0x9e1d64ea29323942e88d1fd49892b25abba76fe3c340d35d98d7a00782aa042e',
        ethValue: '100000000000000',
        blockCreatedAt: '13187872',
      },
    ]);

    const [deposit] = await fetchDeposits(params);

    expect(deposit?.isClassic).toBe(true);
  });

  it('resolves empty when neither source has anything to report', async () => {
    await expect(fetchDeposits(params)).resolves.toEqual([]);

    expect(fetchDepositsFromSubgraphMock).toHaveBeenCalled();
    expect(fetchEthDepositsToCustomDestinationFromSubgraphMock).toHaveBeenCalled();
  });
});
