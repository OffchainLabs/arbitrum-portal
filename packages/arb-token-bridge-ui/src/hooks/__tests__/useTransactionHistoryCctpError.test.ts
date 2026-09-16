/**
 * CCTP history comes from the indexer alone, so a failed fetch has to reach the
 * table's error state. `useCctpFetching` is mocked per chain pair to fail the
 * way an indexer outage does.
 */
import { renderHook, waitFor } from '@testing-library/react';
import type { Address } from 'viem';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ChainId } from '../../types/ChainId';
import { useArbQueryParams } from '../useArbQueryParams';
import { useTransactionHistory } from '../useTransactionHistory';

const ADDRESS = '0x1111111111111111111111111111111111111111' as Address;

// keyed by l1ChainId, the only thing telling the two useCctpFetching calls apart
const { cctpErrors } = vi.hoisted(() => ({
  cctpErrors: new Map<number, { depositsError?: Error; withdrawalsError?: Error }>(),
}));

vi.mock('../../state/cctpState', async (importActual) => ({
  ...(await importActual()),
  useCctpFetching: ({ l1ChainId }: { l1ChainId: number }) => ({
    deposits: undefined,
    withdrawals: undefined,
    isLoadingDeposits: false,
    isLoadingWithdrawals: false,
    depositsError: cctpErrors.get(l1ChainId)?.depositsError,
    withdrawalsError: cctpErrors.get(l1ChainId)?.withdrawalsError,
    mutateDeposits: vi.fn(),
    mutateWithdrawals: vi.fn(),
    setPendingTransfer: vi.fn(),
  }),
}));

vi.mock('wagmi', async (importActual) => ({
  ...(await importActual()),
  useConfig: () => ({}),
  useAccount: () => ({ isConnected: true, chain: { id: 1 }, connector: null }),
}));

vi.mock('next/navigation', async (importActual) => ({
  ...(await importActual()),
  usePathname: vi.fn().mockReturnValue('/bridge'),
}));

vi.mock('../useArbQueryParams', async (importActual) => ({
  ...(await importActual()),
  useArbQueryParams: vi.fn(),
}));

vi.mock('../../util/deposits/fetchDeposits', () => ({
  fetchDeposits: vi.fn().mockResolvedValue([]),
}));

vi.mock('../../util/withdrawals/fetchWithdrawals', async (importActual) => ({
  ...(await importActual()),
  fetchWithdrawals: vi.fn().mockResolvedValue([]),
}));

function setMode(mode: 'mainnet' | 'testnet') {
  const [sourceChain, destinationChain] =
    mode === 'testnet'
      ? [ChainId.Sepolia, ChainId.ArbitrumSepolia]
      : [ChainId.Ethereum, ChainId.ArbitrumOne];

  vi.mocked(useArbQueryParams).mockReturnValue([
    { sourceChain, destinationChain, disabledFeatures: [] },
    vi.fn(),
  ] as unknown as ReturnType<typeof useArbQueryParams>);
}

async function renderAndWaitForError() {
  const { result } = renderHook(() => useTransactionHistory(ADDRESS, { runFetcher: true }));
  await waitFor(() => expect(result.current.error).toBeDefined());
  return result;
}

describe.sequential('useTransactionHistory CCTP errors', () => {
  beforeEach(() => {
    cctpErrors.clear();
    setMode('mainnet');
  });

  it('surfaces a CCTP deposits error', async () => {
    const depositsError = new Error('indexer unavailable');
    cctpErrors.set(ChainId.Ethereum, { depositsError });

    const result = await renderAndWaitForError();

    expect(result.current.error).toBe(depositsError);
  });

  it('surfaces a CCTP withdrawals error', async () => {
    const withdrawalsError = new Error('indexer unavailable');
    cctpErrors.set(ChainId.Ethereum, { withdrawalsError });

    const result = await renderAndWaitForError();

    expect(result.current.error).toBe(withdrawalsError);
  });

  // Both chain pairs are always fetched, but only one is displayed, so a testnet
  // outage must not blank out mainnet history and vice versa.
  it('reports the mainnet error in mainnet mode', async () => {
    const mainnetError = new Error('mainnet indexer unavailable');
    cctpErrors.set(ChainId.Ethereum, { depositsError: mainnetError });
    cctpErrors.set(ChainId.Sepolia, { depositsError: new Error('testnet indexer unavailable') });

    const result = await renderAndWaitForError();

    expect(result.current.error).toBe(mainnetError);
  });

  it('reports the testnet error in testnet mode', async () => {
    const testnetError = new Error('testnet indexer unavailable');
    cctpErrors.set(ChainId.Ethereum, { depositsError: new Error('mainnet indexer unavailable') });
    cctpErrors.set(ChainId.Sepolia, { depositsError: testnetError });
    setMode('testnet');

    const result = await renderAndWaitForError();

    expect(result.current.error).toBe(testnetError);
  });
});
