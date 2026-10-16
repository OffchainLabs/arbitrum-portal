import { afterEach, describe, expect, it, vi } from 'vitest';

import { ChainId } from '../../types/ChainId';

afterEach(() => {
  vi.unstubAllEnvs();
});

// The LiFi pairs read the flag when `constants.ts` loads, so each test loads fresh modules
async function loadWithSolanaFlag(enabled: boolean) {
  vi.resetModules();
  vi.stubEnv('NEXT_PUBLIC_FEATURE_FLAG_SOLANA_ENABLED', String(enabled));
  const [
    { isSupportedChainId },
    { getDestinationChainIds },
    queryParamUtils,
    { getTxHistoryRoutes },
  ] = await Promise.all([
    import('../chainUtils'),
    import('../networks'),
    import('../queryParamUtils'),
    import('../txHistoryRoutes'),
  ]);
  return { isSupportedChainId, getDestinationChainIds, getTxHistoryRoutes, ...queryParamUtils };
}

const destinations = [ChainId.ArbitrumOne, ChainId.RobinhoodChain, ChainId.ApeChain];
const solanaRoute = { parentChainId: ChainId.Solana, childChainId: ChainId.ArbitrumOne };

describe.sequential('Solana network selection', () => {
  it('hides Solana while the flag is off', async () => {
    const {
      isSupportedChainId,
      decodeChainQueryParam,
      getDestinationChainIds,
      sanitizeQueryParams,
      getTxHistoryRoutes,
    } = await loadWithSolanaFlag(false);
    expect(isSupportedChainId(ChainId.Solana)).toBe(false);
    expect(decodeChainQueryParam('solana')).toBeUndefined();
    expect(decodeChainQueryParam(String(ChainId.Solana))).toBeUndefined();
    expect(getDestinationChainIds(ChainId.Solana, { includeLifiEnabledChainPairs: true })).toEqual(
      [],
    );
    expect(
      sanitizeQueryParams({
        sourceChainId: ChainId.Solana,
        destinationChainId: undefined,
        includeLifiEnabledChainPairs: true,
      }).sourceChainId,
    ).not.toBe(ChainId.Solana);
    expect(getTxHistoryRoutes({ isTestnetMode: false })).not.toContainEqual(solanaRoute);
  });

  it('offers the one-way Solana pairs while the flag is on', async () => {
    const {
      encodeChainQueryParam,
      decodeChainQueryParam,
      getDestinationChainIds,
      getTxHistoryRoutes,
    } = await loadWithSolanaFlag(true);
    expect(encodeChainQueryParam(ChainId.Solana)).toBe('solana');
    expect(decodeChainQueryParam('solana')).toBe(ChainId.Solana);
    expect(decodeChainQueryParam(String(ChainId.Solana))).toBe(ChainId.Solana);
    expect(getDestinationChainIds(ChainId.Solana, { includeLifiEnabledChainPairs: true })).toEqual(
      destinations,
    );
    expect(getDestinationChainIds(ChainId.Solana)).toEqual([]);
    for (const destination of destinations) {
      expect(
        getDestinationChainIds(destination, { includeLifiEnabledChainPairs: true }),
      ).not.toContain(ChainId.Solana);
    }
    expect(getTxHistoryRoutes({ isTestnetMode: false })).toContainEqual(solanaRoute);
    expect(getTxHistoryRoutes({ isTestnetMode: true })).not.toContainEqual(solanaRoute);
  });

  it('restores Solana URLs only as a source', async () => {
    const { sanitizeQueryParams } = await loadWithSolanaFlag(true);
    for (const destinationChainId of destinations) {
      expect(
        sanitizeQueryParams({
          sourceChainId: ChainId.Solana,
          destinationChainId,
          includeLifiEnabledChainPairs: true,
        }),
      ).toEqual({ sourceChainId: ChainId.Solana, destinationChainId });
    }
    expect(
      sanitizeQueryParams({
        sourceChainId: ChainId.Solana,
        destinationChainId: ChainId.Base,
        includeLifiEnabledChainPairs: true,
      }),
    ).toEqual({ sourceChainId: ChainId.Solana, destinationChainId: ChainId.ArbitrumOne });
    for (const sourceChainId of [ChainId.Ethereum, ...destinations]) {
      expect(
        sanitizeQueryParams({
          sourceChainId,
          destinationChainId: ChainId.Solana,
          includeLifiEnabledChainPairs: true,
        }).destinationChainId,
      ).not.toBe(ChainId.Solana);
    }
  });
});
