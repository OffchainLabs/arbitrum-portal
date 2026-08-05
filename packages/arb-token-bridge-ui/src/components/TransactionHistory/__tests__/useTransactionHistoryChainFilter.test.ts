/**
 * Verifies the bridge pair → tx history filter sync: the filter follows the
 * pair's longtail endpoint, and a pair change re-defaults even over an explicit
 * selection (one-way flow from bridge to history).
 *
 * The test environment only registers core chains statically (orbit chains
 * register at runtime), so tests demote registered chains to longtail by
 * mocking `isCoreChainForDisplay`.
 */
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useArbQueryParams } from '../../../hooks/useArbQueryParams';
import { ChainId } from '../../../types/ChainId';
import { isCoreChainForDisplay } from '../../../util/networks';
import {
  useSetTxHistoryChainSelection,
  useTxHistoryChainFilter,
} from '../useTransactionHistoryChainFilter';
import { useTransactionHistoryChainFilterStore } from '../useTransactionHistoryChainFilterStore';

vi.mock('next/navigation', async (importActual) => ({
  ...(await importActual()),
  usePathname: vi.fn().mockReturnValue('/bridge'),
}));

vi.mock('../../../hooks/useArbQueryParams', async (importActual) => ({
  ...(await importActual()),
  useArbQueryParams: vi.fn(),
}));

vi.mock('../../../util/networks', async (importActual) => {
  const actual = await importActual<typeof import('../../../util/networks')>();
  return {
    ...actual,
    isCoreChainForDisplay: vi.fn(actual.isCoreChainForDisplay),
  };
});

const actualNetworks =
  await vi.importActual<typeof import('../../../util/networks')>('../../../util/networks');

function mockPair({
  sourceChain,
  destinationChain,
}: {
  sourceChain: number;
  destinationChain: number;
}) {
  vi.mocked(useArbQueryParams).mockReturnValue([
    { sourceChain, destinationChain, disabledFeatures: [] },
    vi.fn(),
  ] as unknown as ReturnType<typeof useArbQueryParams>);
}

function demoteToLongtail(...chainIds: number[]) {
  vi.mocked(isCoreChainForDisplay).mockImplementation(
    (chainId) => !chainIds.includes(chainId) && actualNetworks.isCoreChainForDisplay(chainId),
  );
}

function renderFilter() {
  return renderHook(() => ({
    filter: useTxHistoryChainFilter(),
    setSelection: useSetTxHistoryChainSelection(),
  }));
}

// The suite shares the store and the isCoreChainForDisplay mock across tests.
describe.sequential('useTxHistoryChainFilter bridge pair sync', () => {
  beforeEach(() => {
    useTransactionHistoryChainFilterStore.setState({
      selection: null,
      selectionDefaultChainId: undefined,
    });
    vi.mocked(isCoreChainForDisplay).mockImplementation(actualNetworks.isCoreChainForDisplay);
    vi.unstubAllEnvs();
  });

  it('defaults to All Core Chains for a core pair', () => {
    mockPair({ sourceChain: ChainId.Ethereum, destinationChain: ChainId.ArbitrumOne });

    const { result } = renderFilter();

    expect(result.current.filter.type).toBe('all-core');
  });

  it('defaults to the pair child chain for a longtail pair', () => {
    demoteToLongtail(ChainId.ArbitrumNova);
    mockPair({ sourceChain: ChainId.Ethereum, destinationChain: ChainId.ArbitrumNova });

    const { result } = renderFilter();

    expect(result.current.filter).toEqual({
      type: 'longtail-chain',
      chainId: ChainId.ArbitrumNova,
    });
  });

  it('keeps an explicit selection while the pair stays on core chains', () => {
    mockPair({ sourceChain: ChainId.Ethereum, destinationChain: ChainId.ArbitrumOne });

    const { result, rerender } = renderFilter();
    act(() => {
      result.current.setSelection({ chainIds: [ChainId.ArbitrumNova], isTestnetMode: false });
    });

    mockPair({ sourceChain: ChainId.Ethereum, destinationChain: ChainId.ArbitrumNova });
    rerender();

    expect(result.current.filter).toMatchObject({
      type: 'core-chains',
      chainIds: [ChainId.ArbitrumNova],
    });
  });

  it('re-defaults over an explicit selection when the pair changes to a longtail chain', () => {
    demoteToLongtail(ChainId.ArbitrumNova);
    mockPair({ sourceChain: ChainId.Ethereum, destinationChain: ChainId.ArbitrumOne });

    const { result, rerender } = renderFilter();
    act(() => {
      result.current.setSelection({ chainIds: [ChainId.ArbitrumOne], isTestnetMode: false });
    });
    expect(result.current.filter).toMatchObject({
      type: 'core-chains',
      chainIds: [ChainId.ArbitrumOne],
    });

    mockPair({ sourceChain: ChainId.Ethereum, destinationChain: ChainId.ArbitrumNova });
    rerender();

    expect(result.current.filter).toEqual({
      type: 'longtail-chain',
      chainId: ChainId.ArbitrumNova,
    });
  });

  it('keeps an explicit selection made under the current longtail pair', () => {
    demoteToLongtail(ChainId.ArbitrumNova);
    mockPair({ sourceChain: ChainId.Ethereum, destinationChain: ChainId.ArbitrumNova });

    const { result, rerender } = renderFilter();
    act(() => {
      result.current.setSelection({ chainIds: [ChainId.Ethereum], isTestnetMode: false });
    });
    rerender();

    expect(result.current.filter).toMatchObject({
      type: 'core-chains',
      chainIds: [ChainId.Ethereum],
    });
  });

  // Base is a LiFi-only source chain: it has no canonical children, so
  // `getNetworksRelationship` always resolves it as the pair's parent.
  it('defaults to the pair parent chain when only the parent is longtail', () => {
    vi.stubEnv('NEXT_PUBLIC_FEATURE_FLAG_LIFI', 'true');
    mockPair({ sourceChain: ChainId.Base, destinationChain: ChainId.ArbitrumOne });

    const { result } = renderFilter();

    expect(result.current.filter).toEqual({
      type: 'longtail-chain',
      chainId: ChainId.Base,
    });
  });

  it('defaults to the pair parent chain when the child chain is core', () => {
    vi.stubEnv('NEXT_PUBLIC_FEATURE_FLAG_LIFI', 'true');
    // Robinhood is core for display, so only Base can carry the filter here
    mockPair({ sourceChain: ChainId.Base, destinationChain: ChainId.RobinhoodChain });

    const { result } = renderFilter();

    expect(result.current.filter).toEqual({
      type: 'longtail-chain',
      chainId: ChainId.Base,
    });
  });

  it('prefers the child chain when both endpoints are longtail', () => {
    vi.stubEnv('NEXT_PUBLIC_FEATURE_FLAG_LIFI', 'true');
    mockPair({ sourceChain: ChainId.Base, destinationChain: ChainId.ApeChain });

    const { result } = renderFilter();

    expect(result.current.filter).toEqual({
      type: 'longtail-chain',
      chainId: ChainId.ApeChain,
    });
  });

  it('re-defaults when the pair changes from one longtail chain to another', () => {
    demoteToLongtail(ChainId.ArbitrumOne, ChainId.ArbitrumNova);
    mockPair({ sourceChain: ChainId.Ethereum, destinationChain: ChainId.ArbitrumOne });

    const { result, rerender } = renderFilter();
    act(() => {
      result.current.setSelection({ chainIds: [ChainId.Ethereum], isTestnetMode: false });
    });

    mockPair({ sourceChain: ChainId.Ethereum, destinationChain: ChainId.ArbitrumNova });
    rerender();

    expect(result.current.filter).toEqual({
      type: 'longtail-chain',
      chainId: ChainId.ArbitrumNova,
    });
  });
});
