import { afterAll, describe, expect, it, vi } from 'vitest';

import {
  lifiDestinationChainIds,
  lifiSourceOnlyChainIds,
} from '../../app/api/crosschain-transfers/constants';
import { ChainId } from '../../types/ChainId';
import { getDestinationChainIds, isSupportedChainId } from '../chainUtils';
import { decodeChainQueryParam, sanitizeQueryParams } from '../queryParamUtils';

vi.hoisted(() => vi.stubEnv('NEXT_PUBLIC_FEATURE_FLAG_SOLANA_ENABLED', 'false'));

afterAll(() => vi.unstubAllEnvs());

describe('disabled Solana network selection', () => {
  it('excludes Solana from selectors and restored URLs', () => {
    expect(lifiDestinationChainIds[ChainId.Solana]).toBeUndefined();
    expect(lifiSourceOnlyChainIds.has(ChainId.Solana)).toBe(false);
    expect(isSupportedChainId(ChainId.Solana)).toBe(false);
    expect(decodeChainQueryParam('solana')).toBeUndefined();
    expect(decodeChainQueryParam(String(ChainId.Solana))).toBeUndefined();
    expect(getDestinationChainIds(ChainId.Solana, { includeLifiEnabledChainPairs: true })).toEqual(
      [],
    );
    expect(
      sanitizeQueryParams({
        sourceChainId: ChainId.Solana,
        destinationChainId: ChainId.ArbitrumOne,
        includeLifiEnabledChainPairs: false,
      }),
    ).toEqual({ sourceChainId: ChainId.Ethereum, destinationChainId: ChainId.ArbitrumOne });
  });
});
