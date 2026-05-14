import { constants } from 'ethers';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PathnameEnum } from '@/bridge/constants';

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

  it('sets destinationToken to zero address for first-load apechain -> superposition', async () => {
    await initializeBridgePage({
      searchParams: {
        sourceChain: 'apechain',
        destinationChain: 'superposition',
      },
      redirectPath: PathnameEnum.BRIDGE,
    });

    expect(redirectMock).toHaveBeenCalledTimes(1);
    const redirected = getRedirectedUrl();

    expect(redirected.pathname).toBe(PathnameEnum.BRIDGE);
    expect(redirected.searchParams.get('sourceChain')).toBe('apechain');
    expect(redirected.searchParams.get('destinationChain')).toBe('superposition');
    expect(redirected.searchParams.get('destinationToken')).toBe(constants.AddressZero);
    expect(redirected.searchParams.get('sanitized')).toBe('true');
  });

  it('sets token and destinationToken to zero address for first-load superposition -> apechain', async () => {
    await initializeBridgePage({
      searchParams: {
        sourceChain: 'superposition',
        destinationChain: 'apechain',
      },
      redirectPath: PathnameEnum.BRIDGE,
    });

    expect(redirectMock).toHaveBeenCalledTimes(1);
    const redirected = getRedirectedUrl();

    expect(redirected.pathname).toBe(PathnameEnum.BRIDGE);
    expect(redirected.searchParams.get('sourceChain')).toBe('superposition');
    expect(redirected.searchParams.get('destinationChain')).toBe('apechain');
    expect(redirected.searchParams.get('token')).toBe(constants.AddressZero);
    expect(redirected.searchParams.get('destinationToken')).toBe(constants.AddressZero);
    expect(redirected.searchParams.get('sanitized')).toBe('true');
  });
});
