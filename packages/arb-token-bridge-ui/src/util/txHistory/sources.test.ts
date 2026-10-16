import { afterEach, describe, expect, it, vi } from 'vitest';

import { ChainId } from '../../types/ChainId';
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
describe('isChildChainIndexed', { concurrent: false }, () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  async function importSourcesWith(indexedChainIds: string) {
    vi.stubEnv('NEXT_PUBLIC_INDEXER_CHILD_CHAIN_IDS', indexedChainIds);
    vi.resetModules();
    return import('./sources');
  }

  it('has history for configured chains and none for the rest', async () => {
    const { isChildChainIndexed } = await importSourcesWith('46630,33139');

    expect(isChildChainIndexed(46630)).toBe(true);
    expect(isChildChainIndexed(33139)).toBe(true);
    expect(isChildChainIndexed(ChainId.ArbitrumOne)).toBe(false);
  });

  it('falls back to the core chains when the list is unset', async () => {
    const { isChildChainIndexed } = await importSourcesWith('');

    expect(isChildChainIndexed(ChainId.ArbitrumOne)).toBe(true);
    expect(isChildChainIndexed(ChainId.ArbitrumNova)).toBe(true);
    expect(isChildChainIndexed(ChainId.ArbitrumSepolia)).toBe(true);
    expect(isChildChainIndexed(46630)).toBe(false);
  });

  it('serves Nova from the indexer under the pinned list', async () => {
    vi.resetModules();
    const { isChildChainIndexed } = await import('./sources');

    expect(isChildChainIndexed(ChainId.ArbitrumNova)).toBe(true);
  });

  it('has no history for Nova when a set list leaves it out', async () => {
    const { isChildChainIndexed } = await importSourcesWith('42161');

    expect(isChildChainIndexed(ChainId.ArbitrumNova)).toBe(false);
  });
});
