// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ChainId } from '@/bridge/types/ChainId';
import { CommonAddress } from '@/bridge/util/CommonAddressUtils';

import { DRIP_OPPORTUNITIES_URL, UsdgDripCard } from './UsdgDripCard';
import { shouldShowUsdgDripCard, useUsdgDripCardStore } from './useUsdgDripCardStore';

vi.mock('@/bridge/util/AnalyticsUtils', () => ({ trackEvent: vi.fn() }));
vi.mock('@/bridge/components/common/SiteBanner', () => ({ useSiteBannerVisible: () => false }));
vi.mock('next/image', () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

const CARD_NAME = 'USDG DRIP rewards';

describe('shouldShowUsdgDripCard', () => {
  it('shows for Arbitrum One USDG landing on Arbitrum One', () => {
    expect(
      shouldShowUsdgDripCard({
        destinationChainId: ChainId.ArbitrumOne,
        destinationChainTokenAddress: CommonAddress.ArbitrumOne.USDG,
      }),
    ).toBe(true);
  });

  it('matches the Arbitrum One USDG address regardless of case', () => {
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
    expect(
      shouldShowUsdgDripCard({
        destinationChainId: ChainId.RobinhoodChain,
        destinationChainTokenAddress: CommonAddress.ArbitrumOne.USDG,
      }),
    ).toBe(false);
  });
});

// the store is module-level, so these tests must not interleave
describe.sequential('UsdgDripCard', () => {
  afterEach(() => {
    cleanup();
    act(() => useUsdgDripCardStore.getState().dismiss());
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
    expect(link.getAttribute('href')).toBe(DRIP_OPPORTUNITIES_URL);
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('stays closed after dismissal until the next transfer shows it again', () => {
    render(<UsdgDripCard />);
    act(() => useUsdgDripCardStore.getState().show());

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss USDG DRIP rewards' }));
    expect(screen.queryByRole('complementary', { name: CARD_NAME })).toBeNull();

    act(() => useUsdgDripCardStore.getState().show());
    expect(screen.getByRole('complementary', { name: CARD_NAME })).toBeTruthy();
  });

  it('only slides in when motion is allowed', () => {
    render(<UsdgDripCard />);
    act(() => useUsdgDripCardStore.getState().show());

    const { classList } = screen.getByRole('complementary', { name: CARD_NAME });
    expect(classList.contains('motion-safe:animate-slide-in-right')).toBe(true);
    expect(classList.contains('animate-slide-in-right')).toBe(false);
  });
});
