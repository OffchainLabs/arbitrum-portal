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

  it('resolves empty when neither source has anything to report', async () => {
    await expect(fetchDeposits(params)).resolves.toEqual([]);

    expect(fetchDepositsFromSubgraphMock).toHaveBeenCalled();
    expect(fetchEthDepositsToCustomDestinationFromSubgraphMock).toHaveBeenCalled();
  });
});
