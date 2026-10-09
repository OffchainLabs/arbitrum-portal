import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  allowedLifiDestinationChainIds,
  allowedLifiSourceChainIds,
} from '@/bridge/app/api/crosschain-transfers/constants';
import { ChainId } from '@/bridge/types/ChainId';

import { getLifiTokenRegistry } from '../registry';

vi.hoisted(() => vi.stubEnv('NEXT_PUBLIC_FEATURE_FLAG_SOLANA_ENABLED', 'false'));
const { getTokens } = vi.hoisted(() => ({ getTokens: vi.fn() }));
vi.mock('@lifi/sdk', async (actual) => ({
  ...(await actual<typeof import('@lifi/sdk')>()),
  getTokens,
}));
vi.mock('next/cache', () => ({ unstable_cache: (fetcher: () => unknown) => fetcher }));

describe('registry without Solana enabled', () => {
  beforeEach(() => getTokens.mockReset());
  it('shares the enabled EVM chain set and omits disabled Solana', async () => {
    getTokens.mockResolvedValue({ tokens: {} });
    await getLifiTokenRegistry();
    const chains = [...new Set([...allowedLifiSourceChainIds, ...allowedLifiDestinationChainIds])];
    expect(chains).not.toContain(ChainId.Solana);
    expect(chains).not.toContain(ChainId.Superposition);
    expect(getTokens).toHaveBeenCalledWith({ chains });
  });
});
