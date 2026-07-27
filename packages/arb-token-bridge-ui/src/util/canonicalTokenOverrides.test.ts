import { describe, expect, it } from 'vitest';

import { ChainId } from '../types/ChainId';
import { CommonAddress } from './CommonAddressUtils';
import { CANONICAL_TOKEN_OVERRIDES_BY_CHAIN_PAIR } from './canonicalTokenOverrides';

describe('canonical token overrides', () => {
  it.each([
    {
      parentChainId: ChainId.Ethereum,
      childChainId: ChainId.ArbitrumOne,
      parentAddress: CommonAddress.Ethereum.USDC,
      childAddress: CommonAddress.ArbitrumOne['USDC.e'],
    },
    {
      parentChainId: ChainId.Sepolia,
      childChainId: ChainId.ArbitrumSepolia,
      parentAddress: CommonAddress.Sepolia.USDC,
      childAddress: CommonAddress.ArbitrumSepolia['USDC.e'],
    },
  ])(
    'maps $parentChainId USDC to bridged USDC on $childChainId',
    ({ parentChainId, childChainId, parentAddress, childAddress }) => {
      const token =
        CANONICAL_TOKEN_OVERRIDES_BY_CHAIN_PAIR[`${parentChainId}:${childChainId}`]?.[
          parentAddress
        ];

      expect(token).toMatchObject({
        address: parentAddress,
        l2Address: childAddress,
        symbol: 'USDC',
      });
    },
  );
});
