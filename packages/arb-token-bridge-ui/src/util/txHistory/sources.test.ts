import { describe, expect, it } from 'vitest';

import {
  INDEXER_CHILD_CHAIN_IDS,
  getCanonicalSource,
  isChildChainIndexed,
  parseChainIds,
} from './sources';

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

describe('getCanonicalSource', () => {
  const UNCONFIGURED_CHAIN_ID = 999_999_999;

  it('treats an unconfigured chain as subgraph-backed', () => {
    expect(isChildChainIndexed(UNCONFIGURED_CHAIN_ID)).toBe(false);
    expect(getCanonicalSource(UNCONFIGURED_CHAIN_ID)).toBe('subgraph');
  });

  it('routes configured chains to the indexer', () => {
    for (const childChainId of INDEXER_CHILD_CHAIN_IDS) {
      expect(isChildChainIndexed(childChainId)).toBe(true);
      expect(getCanonicalSource(childChainId)).toBe('indexer');
    }
  });
});
