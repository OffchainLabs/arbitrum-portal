import { afterEach, describe, expect, it, vi } from 'vitest';

import { ChainId } from '../../types/ChainId';

afterEach(() => {
  vi.unstubAllEnvs();
});

// Some modules read the flag when they load, so each test loads fresh modules
async function loadWithElysiumFlag(enabled: boolean) {
  vi.resetModules();
  vi.stubEnv('NEXT_PUBLIC_FEATURE_FLAG_ELYSIUM_ENABLED', String(enabled));
  const [{ isSupportedChainId }, { decodeChainQueryParam }, { isLifiOnlyChain }] =
    await Promise.all([
      import('../chainUtils'),
      import('../queryParamUtils'),
      import('../../wallet/ecosystems'),
    ]);
  return { isSupportedChainId, decodeChainQueryParam, isLifiOnlyChain };
}

describe.sequential('Elysium network selection', () => {
  it('hides Elysium while the flag is off', async () => {
    const { isSupportedChainId, decodeChainQueryParam, isLifiOnlyChain } =
      await loadWithElysiumFlag(false);
    expect(isSupportedChainId(ChainId.Elysium)).toBe(false);
    expect(decodeChainQueryParam('elysium')).toBeUndefined();
    expect(decodeChainQueryParam(String(ChainId.Elysium))).toBeUndefined();
    // Still LiFi-only, so code that reads an old Elysium transfer treats it as one
    expect(isLifiOnlyChain(ChainId.Elysium)).toBe(true);
  });

  it('offers Elysium while the flag is on', async () => {
    const { isSupportedChainId, decodeChainQueryParam } = await loadWithElysiumFlag(true);
    expect(isSupportedChainId(ChainId.Elysium)).toBe(true);
    expect(decodeChainQueryParam('elysium')).toBe(ChainId.Elysium);
  });
});
