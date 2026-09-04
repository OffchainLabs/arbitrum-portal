import { constants } from 'ethers';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PathnameEnum } from '@/bridge/constants';
import { CommonAddress } from '@/bridge/util/CommonAddressUtils';

import { initializeBridgePage } from '../bridgePageUtils';

const { redirectMock, registerLocalNetworkMock } = vi.hoisted(() => {
  process.env.NEXT_PUBLIC_INFURA_KEY ||= 'test-infura-key';
  process.env.NEXT_PUBLIC_FEATURE_FLAG_LIFI = 'true';

  return {
    redirectMock: vi.fn(),
    registerLocalNetworkMock: vi.fn(async () => undefined),
  };
});

vi.mock('next/navigation', () => ({
  redirect: redirectMock,
}));

vi.mock('@/bridge/util/networks', async (importActual) => {
  const actual = await importActual<typeof import('@/bridge/util/networks')>();

  return {
    ...actual,
    registerLocalNetwork: registerLocalNetworkMock,
  };
});

function getRedirectedUrl() {
  const [redirectTarget] = redirectMock.mock.calls.at(-1) ?? [];

  if (!redirectTarget) {
    throw new Error('Expected redirect to be called.');
  }

  return new URL(redirectTarget, 'https://portal.arbitrum.io');
}

function expectRedirectedChains({
  sourceChain,
  destinationChain,
}: {
  sourceChain: string;
  destinationChain: string;
}) {
  const redirected = getRedirectedUrl();

  expect(redirected.pathname).toBe(PathnameEnum.BRIDGE);
  expect(redirected.searchParams.get('sourceChain')).toBe(sourceChain);
  expect(redirected.searchParams.get('destinationChain')).toBe(destinationChain);
  expect(redirected.searchParams.get('sanitized')).toBe('true');
}

describe('initializeBridgePage sanitization', () => {
  beforeEach(() => {
    redirectMock.mockClear();
    registerLocalNetworkMock.mockClear();
  });

  it('does not redirect for the default state when no chain params are provided', async () => {
    await initializeBridgePage({
      searchParams: {},
      redirectPath: PathnameEnum.BRIDGE,
    });

    expect(redirectMock).not.toHaveBeenCalled();
  });

  it('defaults the source chain when the destination chain is valid', async () => {
    await initializeBridgePage({
      searchParams: {
        sourceChain: 'not-a-chain',
        destinationChain: 'superposition',
      },
      redirectPath: PathnameEnum.BRIDGE,
    });

    expect(redirectMock).toHaveBeenCalledTimes(1);
    expectRedirectedChains({
      sourceChain: 'ethereum',
      destinationChain: 'superposition',
    });
  });

  it('defaults the destination chain when the source chain is valid', async () => {
    await initializeBridgePage({
      searchParams: {
        sourceChain: 'apechain',
        destinationChain: 'not-a-chain',
      },
      redirectPath: PathnameEnum.BRIDGE,
    });

    expect(redirectMock).toHaveBeenCalledTimes(1);
    expectRedirectedChains({
      sourceChain: 'apechain',
      destinationChain: 'ethereum',
    });
  });

  describe('USDG on Robinhood Chain', () => {
    it('resolves `destinationToken=usdg` to the Robinhood USDG contract from Arbitrum One', async () => {
      await initializeBridgePage({
        searchParams: {
          sourceChain: 'arbitrum-one',
          destinationChain: 'robinhood-chain',
          destinationToken: 'usdg',
        },
        redirectPath: PathnameEnum.BRIDGE,
      });

      expect(redirectMock).toHaveBeenCalledTimes(1);
      expectRedirectedChains({ sourceChain: 'arbitrum-one', destinationChain: 'robinhood-chain' });
      expect(getRedirectedUrl().searchParams.get('destinationToken')).toBe(
        CommonAddress.RobinhoodChain.USDG,
      );
    });

    it('resolves `destinationToken=usdg` to the Ethereum USDG contract from Ethereum', async () => {
      await initializeBridgePage({
        searchParams: {
          sourceChain: 'ethereum',
          destinationChain: 'robinhood-chain',
          destinationToken: 'usdg',
        },
        redirectPath: PathnameEnum.BRIDGE,
      });

      expect(getRedirectedUrl().searchParams.get('destinationToken')).toBe(
        CommonAddress.Ethereum.USDG,
      );
    });

    it('drops `destinationToken=usdg` when the destination is not Robinhood Chain', async () => {
      await initializeBridgePage({
        searchParams: {
          sourceChain: 'ethereum',
          destinationChain: 'arbitrum-one',
          destinationToken: 'usdg',
        },
        redirectPath: PathnameEnum.BRIDGE,
      });

      expect(redirectMock).toHaveBeenCalledTimes(1);
      expect(getRedirectedUrl().searchParams.has('destinationToken')).toBe(false);
    });

    it('does not redirect a stablecoin deep link that already targets USDG', async () => {
      await initializeBridgePage({
        searchParams: {
          sourceChain: 'arbitrum-one',
          destinationChain: 'robinhood-chain',
          token: CommonAddress.ArbitrumOne.USDC,
          destinationToken: CommonAddress.RobinhoodChain.USDG,
          tab: 'bridge',
        },
        redirectPath: PathnameEnum.BRIDGE,
      });

      expect(redirectMock).not.toHaveBeenCalled();
    });
  });

  it('does not redirect when both networks are invalid', async () => {
    await initializeBridgePage({
      searchParams: {
        sourceChain: 'not-a-chain',
        destinationChain: 'still-not-a-chain',
      },
      redirectPath: PathnameEnum.BRIDGE,
    });

    expect(redirectMock).not.toHaveBeenCalled();
  });

  it('does not redirect when both networks are already valid', async () => {
    await initializeBridgePage({
      searchParams: {
        sourceChain: 'apechain',
        destinationChain: 'superposition',
        destinationToken: constants.AddressZero,
        sanitized: 'true',
      },
      redirectPath: PathnameEnum.BRIDGE,
    });

    expect(redirectMock).not.toHaveBeenCalled();
  });
});
