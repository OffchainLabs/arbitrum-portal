import { describe, expect, it } from 'vitest';

import { getRoutes, getSourceTokens } from '../selectors';
import { ImportResolution, Token, toTokenId } from '../types';
import { hydrateTokens } from '../view';
import { DAI_ARBITRUM, addr, buildFixtureView } from './fixtures';

describe('hydrateTokens', () => {
  it('re-derives id and chainId from the wire format', () => {
    const [token] = hydrateTokens(42161, [
      { address: DAI_ARBITRUM, symbol: 'DAI', name: 'Dai', decimals: 18 },
    ]);

    expect(token).toEqual({
      id: toTokenId(42161, DAI_ARBITRUM),
      chainId: 42161,
      address: DAI_ARBITRUM,
      symbol: 'DAI',
      name: 'Dai',
      decimals: 18,
    });
  });
});

describe('buildRegistryView with a session overlay', () => {
  const importedSource: Token = {
    id: toTokenId(1, addr('dd')),
    chainId: 1,
    address: addr('dd'),
    symbol: 'DEAD',
    name: 'Dead Token',
    decimals: 18,
  };
  const importedDestination: Token = {
    id: toTokenId(42161, addr('ee')),
    chainId: 42161,
    address: addr('ee'),
    symbol: 'DEAD',
    name: 'Dead Token',
    decimals: 18,
  };
  const overlay: ImportResolution = {
    tokens: [importedSource, importedDestination],
    routes: [
      {
        provider: 'canonical',
        sourceTokenId: importedSource.id,
        destinationTokenId: importedDestination.id,
      },
    ],
  };

  const view = buildFixtureView([overlay]);

  it('lists the imported token first in the source tokens', () => {
    expect(getSourceTokens(view)[0]?.id).toBe(importedSource.id);
    expect(getSourceTokens(view, 'dead').map((token) => token.id)).toEqual([importedSource.id]);
  });

  it('returns the overlay route alongside generated routes', () => {
    expect(getRoutes(view, importedSource.id)).toEqual(overlay.routes);
  });

  it('resolves overlay tokens through the view token map', () => {
    expect(view.tokens.get(importedDestination.id)).toEqual(importedDestination);
  });
});
