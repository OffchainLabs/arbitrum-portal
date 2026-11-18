// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useDestinationSelection } from '@/bridge/hooks/useDestinationToken';
import { useMode } from '@/bridge/hooks/useMode';
import { useNetworks } from '@/bridge/hooks/useNetworks';
import { ChainId } from '@/bridge/types/ChainId';
import { trackEvent } from '@/bridge/util/AnalyticsUtils';
import { CommonAddress } from '@/bridge/util/CommonAddressUtils';

import { UsdgDripCard } from './UsdgDripCard';
import {
  shouldShowUsdgDripCard,
  useShowUsdgDripCardAfterSubmit,
  useUsdgDripCardStore,
} from './useUsdgDripCard';

vi.mock('@/bridge/hooks/useDestinationToken', () => ({ useDestinationSelection: vi.fn() }));
vi.mock('@/bridge/hooks/useMode', () => ({ useMode: vi.fn(() => ({ embedMode: false })) }));
vi.mock('@/bridge/hooks/useNetworks', () => ({ useNetworks: vi.fn() }));
vi.mock('@/bridge/util/AnalyticsUtils', () => ({ trackEvent: vi.fn() }));
vi.mock('@/bridge/components/common/SiteBanner', () => ({ useSiteBannerVisible: () => false }));
vi.mock('next/image', () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

const CARD_NAME = 'USDG DRIP rewards';

describe('shouldShowUsdgDripCard', () => {
  it('shows for Arbitrum One USDG landing on Arbitrum One, whatever the address case', () => {
    expect(
      shouldShowUsdgDripCard({
        destinationChainId: ChainId.ArbitrumOne,
        destinationChainTokenAddress: CommonAddress.ArbitrumOne.USDG.toUpperCase(),
      }),
    ).toBe(true);
  });

  it.each([
    ['Ethereum USDG', CommonAddress.Ethereum.USDG],
    ['Robinhood USDG', CommonAddress.RobinhoodChain.USDG],
    ['Arbitrum One USDC', CommonAddress.ArbitrumOne.USDC],
    ['native ETH', undefined],
  ])('hides for %s on Arbitrum One', (_, destinationChainTokenAddress) => {
    expect(
      shouldShowUsdgDripCard({
        destinationChainId: ChainId.ArbitrumOne,
        destinationChainTokenAddress,
      }),
    ).toBe(false);
  });

  it('hides for USDG landing on another chain, withdrawals to Ethereum included', () => {
    expect(
      shouldShowUsdgDripCard({
        destinationChainId: ChainId.Ethereum,
        destinationChainTokenAddress: CommonAddress.Ethereum.USDG,
      }),
    ).toBe(false);
  });
});

// the store is module-level, so these tests must not interleave
describe.sequential('useUsdgDripCardStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    act(() => useUsdgDripCardStore.getState().dismiss());
  });

  it('tracks one impression while the card stays open across transfers', () => {
    act(() => useUsdgDripCardStore.getState().show());
    act(() => useUsdgDripCardStore.getState().show());

    expect(useUsdgDripCardStore.getState().isOpen).toBe(true);
    expect(trackEvent).toHaveBeenCalledTimes(1);
    expect(trackEvent).toHaveBeenCalledWith('USDG DRIP Card', { action: 'shown' });
  });

  it('tracks again once the card re-opens after a dismissal', () => {
    act(() => useUsdgDripCardStore.getState().show());
    act(() => useUsdgDripCardStore.getState().dismiss());
    act(() => useUsdgDripCardStore.getState().show());

    expect(useUsdgDripCardStore.getState().isOpen).toBe(true);
    expect(trackEvent).toHaveBeenCalledTimes(2);
  });
});

describe.sequential('useShowUsdgDripCardAfterSubmit', () => {
  function mockSelection(destinationChainId: ChainId, destinationAddress: string) {
    vi.mocked(useNetworks).mockReturnValue([
      { destinationChain: { id: destinationChainId } },
      vi.fn(),
    ] as unknown as ReturnType<typeof useNetworks>);
    vi.mocked(useDestinationSelection).mockReturnValue({
      destinationAddress,
    } as unknown as ReturnType<typeof useDestinationSelection>);
  }

  beforeEach(() => {
    act(() => useUsdgDripCardStore.getState().dismiss());
  });

  it('opens the card for USDG landing on Arbitrum One', () => {
    mockSelection(ChainId.ArbitrumOne, CommonAddress.ArbitrumOne.USDG);
    const { result } = renderHook(() => useShowUsdgDripCardAfterSubmit());

    act(() => result.current());

    expect(useUsdgDripCardStore.getState().isOpen).toBe(true);
  });

  it('leaves the card closed for any other transfer', () => {
    mockSelection(ChainId.ArbitrumOne, CommonAddress.ArbitrumOne.USDC);
    const { result } = renderHook(() => useShowUsdgDripCardAfterSubmit());

    act(() => result.current());

    expect(useUsdgDripCardStore.getState().isOpen).toBe(false);
  });
});

describe.sequential('UsdgDripCard', () => {
  afterEach(() => {
    cleanup();
    vi.mocked(useMode).mockReturnValue({ embedMode: false });
    act(() => useUsdgDripCardStore.getState().dismiss());
  });

  it('keeps the mobile layout at every width inside the embedded widget', () => {
    vi.mocked(useMode).mockReturnValue({ embedMode: true });
    render(<UsdgDripCard />);
    act(() => useUsdgDripCardStore.getState().show());

    const card = screen.getByRole('complementary', { name: CARD_NAME });
    expect(card.className).toContain('inset-x-4');
    expect(card.className).toContain('bottom-4');
    expect(card.className).not.toContain('md:');
  });

  it('renders nothing until a qualifying transfer shows it', () => {
    render(<UsdgDripCard />);

    expect(screen.queryByRole('complementary', { name: CARD_NAME })).toBeNull();
  });

  it('renders the campaign copy and a new-tab link to the DRIP opportunities', () => {
    render(<UsdgDripCard />);
    act(() => useUsdgDripCardStore.getState().show());

    const card = screen.getByRole('complementary', { name: CARD_NAME });
    expect(card.textContent).toContain('DRIP program');
    expect(card.textContent).toContain('Earn incentivized rewards with your USDG');
    expect(card.textContent).toContain(
      'Supply USDG to Morpho or GMX vaults and earn up to 8% APR.',
    );

    const link = screen.getByRole('link', { name: 'Learn More' });
    expect(link.getAttribute('href')).toBe('https://arbitrumdrip.com/opportunities');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('closes on dismiss, tracks it, and comes back on the next transfer', () => {
    render(<UsdgDripCard />);
    act(() => useUsdgDripCardStore.getState().show());

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss USDG DRIP rewards' }));
    expect(screen.queryByRole('complementary', { name: CARD_NAME })).toBeNull();
    expect(trackEvent).toHaveBeenCalledWith('USDG DRIP Card', { action: 'dismissed' });

    act(() => useUsdgDripCardStore.getState().show());
    expect(screen.getByRole('complementary', { name: CARD_NAME })).toBeTruthy();
  });
});
