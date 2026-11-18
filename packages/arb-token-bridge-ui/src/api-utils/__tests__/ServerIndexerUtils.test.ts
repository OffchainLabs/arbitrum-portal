import { afterEach, describe, expect, it, vi } from 'vitest';

import { ChainId } from '../../types/ChainId';
import { getIndexerApiUrl } from '../ServerIndexerUtils';

const indexerOrigin = 'https://indexer.example';
const otherIndexerOrigin = 'https://indexer-2.example';

function stubIndexerApiUrlByChain(urlByChainId: Record<number, unknown> | string) {
  vi.stubEnv(
    'INDEXER_API_URL_BY_CHAIN',
    typeof urlByChainId === 'string' ? urlByChainId : JSON.stringify(urlByChainId),
  );
}

describe('getIndexerApiUrl', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns the URL configured for the chain', () => {
    stubIndexerApiUrlByChain({ [ChainId.Ethereum]: indexerOrigin });

    expect(getIndexerApiUrl(ChainId.Ethereum)).toBe(indexerOrigin);
  });

  it('resolves each chain to its own deployment', () => {
    stubIndexerApiUrlByChain({
      [ChainId.Ethereum]: indexerOrigin,
      [ChainId.ArbitrumOne]: otherIndexerOrigin,
    });

    expect(getIndexerApiUrl(ChainId.Ethereum)).toBe(indexerOrigin);
    expect(getIndexerApiUrl(ChainId.ArbitrumOne)).toBe(otherIndexerOrigin);
  });

  // Some proxies read an untrimmed base's `//api/v1/...` as a missing path.
  it('trims trailing slashes so callers can append a path', () => {
    stubIndexerApiUrlByChain({ [ChainId.Ethereum]: `${indexerOrigin}///` });

    expect(getIndexerApiUrl(ChainId.Ethereum)).toBe(indexerOrigin);
  });

  it('accepts a plain-http host', () => {
    stubIndexerApiUrlByChain({ [ChainId.Ethereum]: 'http://indexer.internal:8080' });

    expect(getIndexerApiUrl(ChainId.Ethereum)).toBe('http://indexer.internal:8080');
  });

  // Nothing here may throw — callers pick their own failure mode.
  it.each([
    ['an unset variable', ''],
    ['a chain missing from the map', JSON.stringify({ [ChainId.ArbitrumOne]: indexerOrigin })],
    ['malformed JSON', '{"1": '],
    ['a JSON array', `["${indexerOrigin}"]`],
    ['JSON null', 'null'],
    ['a non-URL value', JSON.stringify({ [ChainId.Ethereum]: 'not a url' })],
    ['an empty value', JSON.stringify({ [ChainId.Ethereum]: '' })],
    ['a numeric value', JSON.stringify({ [ChainId.Ethereum]: 42 })],
    ['an object value', JSON.stringify({ [ChainId.Ethereum]: { url: indexerOrigin } })],
    // Both parse, neither is fetchable: `localhost:3000` reads as a custom
    // scheme, so a bare host:port is a misconfiguration, not a shorthand.
    ['a non-HTTP scheme', JSON.stringify({ [ChainId.Ethereum]: 'ftp://indexer.example' })],
    ['a scheme-less host and port', JSON.stringify({ [ChainId.Ethereum]: 'localhost:3000' })],
  ])('returns undefined for %s', (_label, rawEnvValue) => {
    stubIndexerApiUrlByChain(rawEnvValue);

    expect(getIndexerApiUrl(ChainId.Ethereum)).toBeUndefined();
  });
});
