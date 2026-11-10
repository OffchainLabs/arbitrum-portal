import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createWalletTestWrapper } from '../test-utils/wallet-test-wrapper';
import { ChainId } from '../types/ChainId';
import type { EvmAddress, SolanaAddress } from '../util/AddressUtils';
import { defaultWalletContextValue } from '../wallet/WalletContext';
import type { EvmWalletHandle, SolanaWalletHandle, WalletContextValue } from '../wallet/types';
import { useAccountIsBlocked } from './useAccountIsBlocked';

vi.mock('../util/AnalyticsUtils', () => ({ trackEvent: vi.fn() }));
vi.mock('../util/CommonUtils', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../util/CommonUtils')>()),
  isProductionEnvironment: true,
  isE2eTestingEnvironment: false,
}));
vi.mock('../util/featureFlag', async (actual) => ({
  ...(await actual<typeof import('../util/featureFlag')>()),
  isLifiEnabled: () => true,
}));
vi.mock('../wallet/ecosystems/solana', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../wallet/ecosystems/solana')>();
  actual.solanaEcosystem.isEnabled = () => true;
  return actual;
});

const evmAddress = '0x8576aCC5C05D6Ce88f4e49bf65BdF0C62F91353C' as EvmAddress;
const solanaAddress = 'So11111111111111111111111111111111111111112' as SolanaAddress;

const evm: EvmWalletHandle = {
  ...defaultWalletContextValue.evm,
  account: { ecosystem: 'evm', address: evmAddress, status: 'connected' },
  isConnected: true,
};
const solana: SolanaWalletHandle = {
  ...defaultWalletContextValue.solana,
  account: { ecosystem: 'solana', address: solanaAddress, status: 'connected' },
  isConnected: true,
};

function mockScreening(blockedAddresses: string[]) {
  const fetchMock = vi.fn(async (url: URL) => ({
    ok: true,
    json: async () => ({
      blocked: blockedAddresses.includes(url.searchParams.get('address') ?? ''),
    }),
  }));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function screenedRequests(fetchMock: ReturnType<typeof mockScreening>) {
  return fetchMock.mock.calls.map(([url]) => ({
    address: url.searchParams.get('address'),
    chain: url.searchParams.get('chain'),
  }));
}

function renderUseAccountIsBlocked({
  wallets = { evm, solana },
  sourceChain,
  destinationChain,
}: {
  wallets?: WalletContextValue;
  sourceChain: ChainId;
  destinationChain: ChainId;
}) {
  return renderHook(() => useAccountIsBlocked(), {
    wrapper: createWalletTestWrapper({ wallets, query: { sourceChain, destinationChain } }),
  });
}

// The tests share the stubbed `fetch`
describe.sequential('useAccountIsBlocked', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_SCREENING_API_ENDPOINT', 'https://screening.test/api/screenings');
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('screens the normalized EVM address without a chain on an EVM route', async () => {
    const fetchMock = mockScreening([evmAddress.toLowerCase()]);

    const { result } = renderUseAccountIsBlocked({
      sourceChain: ChainId.ArbitrumOne,
      destinationChain: ChainId.Ethereum,
    });

    await waitFor(() => expect(result.current.isBlocked).toBe(true));
    expect(result.current.blockedAddress).toBe(evmAddress.toLowerCase());
    expect(screenedRequests(fetchMock)).toEqual([
      { address: evmAddress.toLowerCase(), chain: null },
    ]);
  });

  it('screens the Solana source wallet on Solana, keeping its case', async () => {
    const fetchMock = mockScreening([solanaAddress]);

    const { result } = renderUseAccountIsBlocked({
      sourceChain: ChainId.Solana,
      destinationChain: ChainId.ArbitrumOne,
    });

    await waitFor(() => expect(result.current.isBlocked).toBe(true));
    expect(result.current.blockedAddress).toBe(solanaAddress);
    expect(screenedRequests(fetchMock)).toEqual(
      expect.arrayContaining([
        { address: solanaAddress, chain: 'solana' },
        { address: evmAddress.toLowerCase(), chain: null },
      ]),
    );
  });

  it('returns the blocked destination address', async () => {
    mockScreening([evmAddress.toLowerCase()]);

    const { result } = renderUseAccountIsBlocked({
      sourceChain: ChainId.Solana,
      destinationChain: ChainId.ArbitrumOne,
    });

    await waitFor(() => expect(result.current.isBlocked).toBe(true));
    expect(result.current.blockedAddress).toBe(evmAddress.toLowerCase());
  });

  it('does not screen disconnected wallets', async () => {
    const fetchMock = mockScreening([]);

    const { result } = renderUseAccountIsBlocked({
      wallets: defaultWalletContextValue,
      sourceChain: ChainId.Solana,
      destinationChain: ChainId.ArbitrumOne,
    });

    await waitFor(() => expect(result.current.isBlocked).toBeFalsy());
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
