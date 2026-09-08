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
    expect(parseChainIds('46630, 33139 , 55244')).toEqual([46630, 33139, 55244]);
  });

  it('ignores invalid values', () => {
    expect(parseChainIds('46630,abc,,-1,0,1.5')).toEqual([46630]);
  });

  it('dedupes repeated chain ids', () => {
    expect(parseChainIds('46630,46630,33139')).toEqual([46630, 33139]);
  });
});

describe.sequential('hasBridgeHistory', () => {
  // INDEXER_CHILD_CHAIN_IDS is evaluated at module load, so stub the env and re-import
  // per case to make routing deterministic regardless of the ambient env.
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
    const { hasBridgeHistory, isChildChainIndexed } = await importSourcesWith('46630,33139');

    expect(isChildChainIndexed(46630)).toBe(true);
    expect(hasBridgeHistory(46630)).toBe(true);
    expect(hasBridgeHistory(33139)).toBe(true);

    expect(isChildChainIndexed(ChainId.ArbitrumOne)).toBe(false);
    expect(hasBridgeHistory(ChainId.ArbitrumOne)).toBe(false);
  });

  it('has history for Nova without it being configured', async () => {
    const { hasBridgeHistory, isChildChainIndexed } = await importSourcesWith('');

    expect(isChildChainIndexed(ChainId.ArbitrumNova)).toBe(false);
    expect(hasBridgeHistory(ChainId.ArbitrumNova)).toBe(true);
  });
});
