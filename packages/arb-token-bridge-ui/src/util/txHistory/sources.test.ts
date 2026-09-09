import { afterEach, describe, expect, it, vi } from 'vitest';

import { parseChainIds } from './sources';

describe('parseChainIds', () => {
  it('returns an empty list for empty input', () => {
    expect(parseChainIds(undefined)).toEqual([]);
    expect(parseChainIds('')).toEqual([]);
    expect(parseChainIds('   ')).toEqual([]);
  });

  it('parses a comma-separated list', () => {
    expect(parseChainIds('46630')).toEqual([46630]);
    expect(parseChainIds('46630, 33139 , 4663')).toEqual([46630, 33139, 4663]);
  });

  it('ignores invalid values', () => {
    expect(parseChainIds('46630,abc,,-1,0,1.5')).toEqual([46630]);
  });

  it('dedupes repeated chain ids', () => {
    expect(parseChainIds('46630,46630,33139')).toEqual([46630, 33139]);
  });
});

// INDEXER_CHILD_CHAIN_IDS is evaluated at module load, so each case stubs the env and
// re-imports the module. The cases must not run concurrently (the global default): one
// case's afterEach unstubs the env while another's import is still evaluating.
describe('getCanonicalSource', { concurrent: false }, () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  async function importSourcesWith(indexedChainIds: string) {
    vi.stubEnv('NEXT_PUBLIC_INDEXER_CHILD_CHAIN_IDS', indexedChainIds);
    vi.resetModules();
    return import('./sources');
  }

  it('treats an unconfigured chain as subgraph-backed', async () => {
    const { getCanonicalSource, isChildChainIndexed } = await importSourcesWith('');

    expect(isChildChainIndexed(42161)).toBe(false);
    expect(getCanonicalSource(42161)).toBe('subgraph');
  });

  it('routes configured chains to the indexer and leaves others on the subgraph', async () => {
    const { getCanonicalSource, isChildChainIndexed } = await importSourcesWith('46630,33139');

    expect(isChildChainIndexed(46630)).toBe(true);
    expect(getCanonicalSource(46630)).toBe('indexer');
    expect(isChildChainIndexed(33139)).toBe(true);

    expect(isChildChainIndexed(42161)).toBe(false);
    expect(getCanonicalSource(42161)).toBe('subgraph');
  });
});
