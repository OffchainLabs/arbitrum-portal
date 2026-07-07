import { beforeEach, describe, expect, it, vi } from 'vitest';

import { isChildChainIndexed } from '../../util/txHistory/sources';
import { isIndexerEnabledForRequest } from './indexer';

vi.mock('../../util/txHistory/sources', () => ({
  isChildChainIndexed: vi.fn(),
}));

const isChildChainIndexedMock = vi.mocked(isChildChainIndexed);

const INDEXED_CHAIN_ID = 660279;
const NON_INDEXED_CHAIN_ID = 42161;

function requestForChain(l2ChainId?: number) {
  const url = l2ChainId
    ? `https://app.test/api/withdrawals?l2ChainId=${l2ChainId}`
    : 'https://app.test/api/withdrawals';
  return { url } as never;
}

describe.sequential('isIndexerEnabledForRequest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isChildChainIndexedMock.mockImplementation((chainId) => chainId === INDEXED_CHAIN_ID);
  });

  it('routes an indexed chain to the indexer', () => {
    expect(isIndexerEnabledForRequest(requestForChain(INDEXED_CHAIN_ID))).toBe(true);
    expect(isChildChainIndexedMock).toHaveBeenCalledWith(INDEXED_CHAIN_ID);
  });

  it('routes a non-indexed chain to the subgraph', () => {
    expect(isIndexerEnabledForRequest(requestForChain(NON_INDEXED_CHAIN_ID))).toBe(false);
  });

  it('falls back to the subgraph when l2ChainId is missing', () => {
    expect(isIndexerEnabledForRequest(requestForChain())).toBe(false);
    expect(isChildChainIndexedMock).not.toHaveBeenCalled();
  });
});
