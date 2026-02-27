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

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

function getRedirectedUrl() {
  const [redirectTarget] = redirectMock.mock.calls.at(-1) ?? [];

  if (!redirectTarget) {
    throw new Error('Expected redirect to be called.');
  }

  return new URL(redirectTarget, 'https://example.com');
}

describe('initializeBridgePage sanitization', () => {
  beforeEach(() => {
    redirectMock.mockClear();
    registerLocalNetworkMock.mockClear();
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
    expect(redirected.searchParams.get('destinationToken')).toBe(ZERO_ADDRESS);
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
    expect(redirected.searchParams.get('token')).toBe(ZERO_ADDRESS);
    expect(redirected.searchParams.get('destinationToken')).toBe(ZERO_ADDRESS);
    expect(redirected.searchParams.get('sanitized')).toBe('true');
  });
});
