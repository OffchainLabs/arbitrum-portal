import { describe, expect, it } from 'vitest';

import { ChainId } from '../../types/ChainId';
import { getDestinationChainIds, isSupportedChainId } from '../chainUtils';
import { decodeChainQueryParam, sanitizeQueryParams } from '../queryParamUtils';

describe('disabled Solana network selection', () => {
  it('excludes Solana from selectors and restored URLs', () => {
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
