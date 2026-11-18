import { describe, expect, it } from 'vitest';

import { ChainId } from '../../../types/ChainId';
import { CommonAddress } from '../../../util/CommonAddressUtils';
import { allowsUnmatchedLifiTokens, isUnmatchedLifiTokenAllowed } from './constants';

const unlistedAddress = '0x0000000000000000000000000000000000000001';

describe('allowsUnmatchedLifiTokens', () => {
  it('allows all unmatched tokens only on Robinhood Chain', () => {
    expect(allowsUnmatchedLifiTokens(ChainId.RobinhoodChain)).toBe(true);

    for (const chainId of [
      ChainId.Ethereum,
      ChainId.ArbitrumOne,
      ChainId.ArbitrumNova,
      ChainId.ApeChain,
      ChainId.Base,
    ]) {
      expect(allowsUnmatchedLifiTokens(chainId)).toBe(false);
    }
  });
});

describe('isUnmatchedLifiTokenAllowed', () => {
  it('allows any address on a chain that allows all unmatched tokens', () => {
    expect(isUnmatchedLifiTokenAllowed(ChainId.RobinhoodChain, unlistedAddress)).toBe(true);
    expect(isUnmatchedLifiTokenAllowed(ChainId.RobinhoodChain, CommonAddress.Base.USDC)).toBe(true);
  });

  it('allows an individually allowlisted address on its own chain', () => {
    expect(isUnmatchedLifiTokenAllowed(ChainId.Base, CommonAddress.Base.USDC)).toBe(true);
  });

  it('matches allowlisted addresses regardless of casing or surrounding whitespace', () => {
    expect(isUnmatchedLifiTokenAllowed(ChainId.Base, CommonAddress.Base.USDC.toUpperCase())).toBe(
      true,
    );
    expect(isUnmatchedLifiTokenAllowed(ChainId.Base, ` ${CommonAddress.Base.USDC} `)).toBe(true);
  });

  it('does not treat the address list as a blanket permission for the chain', () => {
    expect(isUnmatchedLifiTokenAllowed(ChainId.Base, unlistedAddress)).toBe(false);
    expect(isUnmatchedLifiTokenAllowed(ChainId.Base, CommonAddress.Base.USDT)).toBe(false);
  });

  it('does not carry an allowlisted address over to another chain', () => {
    for (const chainId of [ChainId.Ethereum, ChainId.ArbitrumOne, ChainId.ApeChain]) {
      expect(isUnmatchedLifiTokenAllowed(chainId, CommonAddress.Base.USDC)).toBe(false);
    }
  });

  it('rejects every address on a chain with no policy entry', () => {
    expect(isUnmatchedLifiTokenAllowed(ChainId.ArbitrumNova, unlistedAddress)).toBe(false);
    expect(isUnmatchedLifiTokenAllowed(ChainId.ArbitrumNova, CommonAddress.ArbitrumOne.USDC)).toBe(
      false,
    );
  });
});
