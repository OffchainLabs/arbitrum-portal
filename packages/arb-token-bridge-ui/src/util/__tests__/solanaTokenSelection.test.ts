import { constants } from 'ethers';
import { describe, expect, it, vi } from 'vitest';

import { type ERC20BridgeToken, TokenType } from '../../hooks/arbTokenBridge.types';
import { ChainId } from '../../types/ChainId';
import { resolveDestinationSelection } from '../TokenSelectionUtils';
import { getChainMetadata } from '../networkMetadata';

vi.hoisted(() => vi.stubEnv('NEXT_PUBLIC_FEATURE_FLAG_SOLANA_ENABLED', 'true'));

const unmatched: ERC20BridgeToken = {
  address: 'XsQAm7K8RQuTg4BXy9qfXUxqHkHRwLNxikbRfn9kw4w',
  name: 'Unmatched Solana token',
  symbol: 'UNMATCHED',
  decimals: 6,
  type: TokenType.ERC20,
  listIds: new Set(),
  lifiOnlyChainId: ChainId.Solana,
};

describe('unmatched Solana destination selection', () => {
  it.each([
    { destinationChainId: ChainId.ArbitrumOne, symbol: 'ETH' },
    { destinationChainId: ChainId.ApeChain, symbol: 'APE' },
    { destinationChainId: ChainId.Superposition, symbol: 'ETH' },
  ])(
    'defaults to the native currency of destination $destinationChainId',
    ({ destinationChainId, symbol }) => {
      const selection = resolveDestinationSelection({
        sourceToken: unmatched,
        sourceChainId: ChainId.Solana,
        destinationChainId,
        destinationTokenLookupKey: unmatched.address,
        bridgeTokens: { [unmatched.address]: unmatched },
        isDepositMode: true,
      });
      expect(selection).toMatchObject({
        token: null,
        isSwap: true,
        destinationAddress: constants.AddressZero,
      });
      expect(getChainMetadata(destinationChainId).nativeCurrency.symbol).toBe(symbol);
    },
  );
});
