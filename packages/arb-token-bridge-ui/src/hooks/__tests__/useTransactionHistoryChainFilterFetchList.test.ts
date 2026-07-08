/**
 * Verifies the chain filter actually narrows the RPC fetch list — the core
 * promise of tx-history chain filtering. `fetchDeposits` is mocked, so these
 * tests assert exactly which chain pairs the fetcher fans out to for a given
 * filter selection, without hitting any RPC.
 */
import { StaticJsonRpcProvider } from '@ethersproject/providers';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useTransactionHistoryChainFilterStore } from '../../components/TransactionHistory/useTransactionHistoryChainFilterStore';
import { ChainId } from '../../types/ChainId';
import { Address } from '../../util/AddressUtils';
import { fetchDeposits } from '../../util/deposits/fetchDeposits';
import { isNetwork } from '../../util/networks';
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

// Pin the bridge pair to Eth <> Arbitrum One (mainnet), so the filter's
// derived default is [ArbitrumOne].
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

// The chain pairs the deposits fetcher actually fanned out to, as "parent-child" keys.
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

// A statically registered mainnet chain outside the default (Arbitrum One)
// scope, whichever the registry currently has. Orbit chains register at
// runtime, so they never appear in the test environment's fetch list.
function getChainOutsideDefaultScope(): number | undefined {
  return getMultiChainFetchList()
    .filter((pair) => !isNetwork(pair.parentChainId).isTestnet)
    .find(
      (pair) =>
        pair.parentChainId !== ChainId.ArbitrumOne && pair.childChainId !== ChainId.ArbitrumOne,
    )?.childChainId;
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

  it('default selection fetches only the pairs touching the bridge child chain', async () => {
    await renderAndWaitForFetch();

    const pairs = fetchedDepositPairs();
    // Set equality: everything touching the default chain, and nothing else.
    const expected = mainnetPairsMatching(
      (parent, child) => parent === ChainId.ArbitrumOne || child === ChainId.ArbitrumOne,
    );

    expect(pairs.sort()).toEqual(expected.sort());
    expect(pairs).toContain(`${ChainId.Ethereum}-${ChainId.ArbitrumOne}`);
  }, 40_000);

  it('a single-chain selection fetches only the pairs touching that chain', async (ctx) => {
    const chainId = getChainOutsideDefaultScope();
    if (chainId === undefined) {
      return ctx.skip();
    }

    useTransactionHistoryChainFilterStore.setState({
      selection: { chainIds: [chainId], isTestnetMode: false },
    });
    await renderAndWaitForFetch();

    expect(fetchedDepositPairs().sort()).toEqual(
      mainnetPairsMatching((parent, child) => parent === chainId || child === chainId).sort(),
    );
  }, 40_000);

  it('the All Chains selection fetches every mainnet pair', async () => {
    useTransactionHistoryChainFilterStore.setState({
      selection: { chainIds: [], isTestnetMode: false },
    });
    await renderAndWaitForFetch();

    const pairs = fetchedDepositPairs();

    expect(pairs.length).toBeGreaterThan(1);
    expect(pairs.sort()).toEqual(mainnetPairsMatching(() => true).sort());
  }, 40_000);
});
