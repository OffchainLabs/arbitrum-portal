/**
 * Verifies the chain filter narrows the RPC fetch list — the core promise of
 * tx-history chain filtering. `fetchDeposits` is mocked to capture exactly
 * which chain pairs the fetcher fans out to for a given selection.
 */
import { StaticJsonRpcProvider } from '@ethersproject/providers';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useTransactionHistoryChainFilterStore } from '../../components/TransactionHistory/useTransactionHistoryChainFilterStore';
import { ChainId } from '../../types/ChainId';
import { Address } from '../../util/AddressUtils';
import { fetchDeposits } from '../../util/deposits/fetchDeposits';
import { isCoreChainForDisplay, isNetwork } from '../../util/networks';
import { getMultiChainFetchList } from '../../util/txHistoryRoutes';
import { useTransactionHistory } from '../useTransactionHistory';

const ADDRESS = '0x1111111111111111111111111111111111111111' as Address;

vi.mock('wagmi', async (importActual) => ({
  ...(await importActual()),
  useAccount: () => ({ isConnected: true, chain: { id: 1 }, connector: null }),
}));

vi.mock('next/navigation', async (importActual) => ({
  ...(await importActual()),
  usePathname: vi.fn().mockReturnValue('/bridge'),
}));

vi.mock('../useArbQueryParams', async (importActual) => ({
  ...(await importActual()),
  useArbQueryParams: vi
    .fn()
    .mockReturnValue([{ sourceChain: 1, destinationChain: 42161, disabledFeatures: [] }, vi.fn()]),
}));

vi.mock('../../util/deposits/fetchDeposits', () => ({
  fetchDeposits: vi.fn().mockResolvedValue([]),
}));

vi.mock('../../util/withdrawals/fetchWithdrawals', async (importActual) => ({
  ...(await importActual()),
  fetchWithdrawals: vi.fn().mockResolvedValue([]),
}));

function fetchedDepositPairs(): string[] {
  return vi.mocked(fetchDeposits).mock.calls.map(([params]) => {
    const parentChainId = (params.l1Provider as StaticJsonRpcProvider).network.chainId;
    const childChainId = (params.l2Provider as StaticJsonRpcProvider).network.chainId;
    return `${parentChainId}-${childChainId}`;
  });
}

function mainnetPairsMatching(predicate: (parent: number, child: number) => boolean): string[] {
  return getMultiChainFetchList()
    .filter((pair) => !isNetwork(pair.parentChainId).isTestnet)
    .filter((pair) => predicate(pair.parentChainId, pair.childChainId))
    .map((pair) => `${pair.parentChainId}-${pair.childChainId}`);
}

// A statically registered mainnet longtail (non-core) child chain, whichever
// the registry currently has. Orbit chains register at runtime, so they may
// not appear in the test environment's fetch list.
function getLongtailPair() {
  return getMultiChainFetchList()
    .filter((pair) => !isNetwork(pair.parentChainId).isTestnet)
    .find((pair) => !isCoreChainForDisplay(pair.childChainId));
}

async function renderAndWaitForFetch() {
  renderHook(() => useTransactionHistory(ADDRESS, { runFetcher: true }));
  await waitFor(() => expect(fetchDeposits).toHaveBeenCalled(), { timeout: 30_000 });
}

describe.sequential('useTransactionHistory fetch list narrowing', () => {
  beforeEach(() => {
    useTransactionHistoryChainFilterStore.setState({ selection: null });
    vi.mocked(fetchDeposits).mockClear();
  });

  it('the default All Core Chains selection fetches only the pairs with both endpoints core', async () => {
    await renderAndWaitForFetch();

    const pairs = fetchedDepositPairs();
    const expected = mainnetPairsMatching(
      (parent, child) => isCoreChainForDisplay(parent) && isCoreChainForDisplay(child),
    );

    expect(pairs.sort()).toEqual(expected.sort());
    expect(pairs).toContain(`${ChainId.Ethereum}-${ChainId.ArbitrumOne}`);
  }, 40_000);

  it('a core-chain selection fetches only that chain’s pairs with other core chains', async () => {
    useTransactionHistoryChainFilterStore.setState({
      selection: { chainId: ChainId.Ethereum, isTestnetMode: false },
    });
    await renderAndWaitForFetch();

    expect(fetchedDepositPairs().sort()).toEqual(
      mainnetPairsMatching(
        (parent, child) =>
          (parent === ChainId.Ethereum || child === ChainId.Ethereum) &&
          isCoreChainForDisplay(parent) &&
          isCoreChainForDisplay(child),
      ).sort(),
    );
  }, 40_000);

  it('a longtail-chain selection fetches only the pairs touching that chain', async (ctx) => {
    const longtailPair = getLongtailPair();
    if (!longtailPair) {
      return ctx.skip();
    }

    const longtailChainId = longtailPair.childChainId;
    useTransactionHistoryChainFilterStore.setState({
      selection: { chainId: longtailChainId, isTestnetMode: false },
    });
    await renderAndWaitForFetch();

    expect(fetchedDepositPairs().sort()).toEqual(
      mainnetPairsMatching(
        (parent, child) => parent === longtailChainId || child === longtailChainId,
      ).sort(),
    );
  }, 40_000);
});
