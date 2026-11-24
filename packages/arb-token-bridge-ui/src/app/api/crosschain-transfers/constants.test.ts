import { describe, expect, it } from 'vitest';

import { ChainId } from '../../../types/ChainId';
import { CommonAddress } from '../../../util/CommonAddressUtils';
import {
  allowsUnmatchedLifiTokens,
  buildLifiDestinationChainIds,
  isUnmatchedLifiTokenAllowed,
  lifiDestinationChainIds,
} from './constants';

const unlistedAddress = '0x0000000000000000000000000000000000000001';

describe('lifiDestinationChainIds', () => {
  it('lists the LiFi routes of each EVM source chain', () => {
    // Solana's routes depend on its feature flag, which the tests don't pin
    const { [ChainId.Solana]: _solanaRoutes, ...evmRoutes } = lifiDestinationChainIds;
    expect(evmRoutes).toEqual({
      [ChainId.Ethereum]: [
        ChainId.ArbitrumOne,
        ChainId.ArbitrumNova,
        ChainId.ApeChain,
        ChainId.RobinhoodChain,
        ChainId.Elysium,
      ],
      [ChainId.ArbitrumOne]: [
        ChainId.Ethereum,
        ChainId.ApeChain,
        ChainId.RobinhoodChain,
        ChainId.Elysium,
      ],
      [ChainId.ArbitrumNova]: [ChainId.Ethereum, ChainId.ArbitrumOne],
      [ChainId.ApeChain]: [
        ChainId.Ethereum,
        ChainId.ArbitrumOne,
        ChainId.RobinhoodChain,
        ChainId.Elysium,
      ],
      [ChainId.Base]: [
        ChainId.ArbitrumOne,
        ChainId.ApeChain,
        ChainId.RobinhoodChain,
        ChainId.Elysium,
      ],
      [ChainId.RobinhoodChain]: [
        ChainId.Ethereum,
        ChainId.ArbitrumOne,
        ChainId.ApeChain,
        ChainId.Elysium,
      ],
      [ChainId.Elysium]: [
        ChainId.Ethereum,
        ChainId.ArbitrumOne,
        ChainId.ApeChain,
        ChainId.RobinhoodChain,
      ],
    });
  });
});

describe('buildLifiDestinationChainIds', () => {
  const newChainId = 1234;

  it("adds a chain's sources to their own destinations", () => {
    expect(
      buildLifiDestinationChainIds(
        {
          [ChainId.Ethereum]: { destinationChainIds: [ChainId.ArbitrumOne] },
          [newChainId]: {
            destinationChainIds: [ChainId.Ethereum],
            sourceChainIds: [ChainId.Ethereum, ChainId.Base],
          },
        },
        new Set(),
      ),
    ).toEqual({
      [ChainId.Ethereum]: [ChainId.ArbitrumOne, newChainId],
      [ChainId.Base]: [newChainId],
      [newChainId]: [ChainId.Ethereum],
    });
  });

  it("keeps a source chain's own destinations first", () => {
    expect(
      buildLifiDestinationChainIds(
        {
          [newChainId]: { sourceChainIds: [ChainId.Solana] },
          [ChainId.Solana]: { destinationChainIds: [ChainId.ArbitrumOne] },
        },
        new Set(),
      ),
    ).toEqual({ [ChainId.Solana]: [ChainId.ArbitrumOne, newChainId] });
  });

  it('lists a route declared on both chains once', () => {
    expect(
      buildLifiDestinationChainIds(
        {
          [ChainId.Ethereum]: { destinationChainIds: [newChainId] },
          [newChainId]: { sourceChainIds: [ChainId.Ethereum] },
        },
        new Set(),
      ),
    ).toEqual({ [ChainId.Ethereum]: [newChainId] });
  });

  it('drops the routes from and to a disabled chain', () => {
    expect(
      buildLifiDestinationChainIds(
        {
          [ChainId.Solana]: { destinationChainIds: [ChainId.ArbitrumOne] },
          [newChainId]: {
            destinationChainIds: [ChainId.ArbitrumOne],
            sourceChainIds: [ChainId.Solana, ChainId.ArbitrumOne],
          },
        },
        new Set([ChainId.Solana]),
      ),
    ).toEqual({
      [ChainId.ArbitrumOne]: [newChainId],
      [newChainId]: [ChainId.ArbitrumOne],
    });
  });
});

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

describe('Elysium LiFi routes', () => {
  const twoWayChainIds = [
    ChainId.Ethereum,
    ChainId.ArbitrumOne,
    ChainId.ApeChain,
    ChainId.RobinhoodChain,
  ];

  it('connects Elysium both ways with Ethereum, Arbitrum One, ApeChain and Robinhood Chain', () => {
    expect(lifiDestinationChainIds[ChainId.Elysium]).toEqual(twoWayChainIds);
    for (const chainId of twoWayChainIds) {
      expect(lifiDestinationChainIds[chainId]).toContain(ChainId.Elysium);
    }
  });

  it('only deposits to Elysium from Base', () => {
    expect(lifiDestinationChainIds[ChainId.Base]).toContain(ChainId.Elysium);
    expect(lifiDestinationChainIds[ChainId.Elysium]).not.toContain(ChainId.Base);
  });
});
