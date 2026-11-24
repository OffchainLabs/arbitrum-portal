import { afterEach, describe, expect, it, vi } from 'vitest';

import { ChainId } from '../../types/ChainId';

afterEach(() => {
  vi.unstubAllEnvs();
});

// The LiFi pairs read the flag when `constants.ts` loads, so each test loads fresh modules
async function loadWithElysiumFlag(enabled: boolean) {
  vi.resetModules();
  vi.stubEnv('NEXT_PUBLIC_FEATURE_FLAG_ELYSIUM_ENABLED', String(enabled));
  const [
    { isSupportedChainId },
    { getDestinationChainIds },
    { decodeChainQueryParam },
    { lifiDestinationChainIds },
    { isLifiOnlyChain },
  ] = await Promise.all([
    import('../chainUtils'),
    import('../networks'),
    import('../queryParamUtils'),
    import('../../app/api/crosschain-transfers/constants'),
    import('../../wallet/ecosystems'),
  ]);
  return {
    isSupportedChainId,
    getDestinationChainIds,
    decodeChainQueryParam,
    lifiDestinationChainIds,
    isLifiOnlyChain,
  };
}

describe.sequential('Elysium network selection', () => {
  it('hides Elysium while the flag is off', async () => {
    const {
      isSupportedChainId,
      decodeChainQueryParam,
      getDestinationChainIds,
      lifiDestinationChainIds,
      isLifiOnlyChain,
    } = await loadWithElysiumFlag(false);
    expect(isSupportedChainId(ChainId.Elysium)).toBe(false);
    expect(decodeChainQueryParam('elysium')).toBeUndefined();
    expect(decodeChainQueryParam(String(ChainId.Elysium))).toBeUndefined();
    expect(lifiDestinationChainIds[ChainId.Elysium]).toBeUndefined();
    for (const sourceChainId of [ChainId.Ethereum, ChainId.ArbitrumOne, ChainId.Base]) {
      expect(
        getDestinationChainIds(sourceChainId, { includeLifiEnabledChainPairs: true }),
      ).not.toContain(ChainId.Elysium);
    }
    // Still LiFi-only, so code that reads an old Elysium transfer treats it as one
    expect(isLifiOnlyChain(ChainId.Elysium)).toBe(true);
  });

  it('offers the Elysium pairs while the flag is on', async () => {
    const { isSupportedChainId, decodeChainQueryParam, getDestinationChainIds } =
      await loadWithElysiumFlag(true);
    expect(isSupportedChainId(ChainId.Elysium)).toBe(true);
    expect(decodeChainQueryParam('elysium')).toBe(ChainId.Elysium);
    expect(getDestinationChainIds(ChainId.Elysium, { includeLifiEnabledChainPairs: true })).toEqual(
      expect.arrayContaining([ChainId.Ethereum, ChainId.ArbitrumOne]),
    );
    expect(getDestinationChainIds(ChainId.Base, { includeLifiEnabledChainPairs: true })).toContain(
      ChainId.Elysium,
    );
  });
});
