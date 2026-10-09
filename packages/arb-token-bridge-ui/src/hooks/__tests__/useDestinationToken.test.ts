import { renderHook, waitFor } from '@testing-library/react';
import { constants } from 'ethers';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { getTokenOverride } from '../../app/api/crosschain-transfers/utils';
import { useIsSwapTransfer } from '../../components/TransferPanel/hooks/useIsSwapTransfer';
import { createBridgeTestWrapper } from '../../test-utils/bridge-test-wrapper';
import { ChainId } from '../../types/ChainId';
import { CommonAddress } from '../../util/CommonAddressUtils';
import { initializeBridgeNetworks } from '../../util/networks';
import { type ERC20BridgeToken, TokenType } from '../arbTokenBridge.types';
import { useDestinationToken } from '../useDestinationToken';

beforeAll(initializeBridgeNetworks);
vi.mock('../../app/api/crosschain-transfers/utils', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../app/api/crosschain-transfers/utils')>()),
  getTokenOverride: vi.fn(() => ({ source: null, destination: null })),
}));

const selected: ERC20BridgeToken = {
  type: TokenType.ERC20,
  decimals: 18,
  name: 'Selected Token',
  symbol: 'SEL',
  address: '0x1111111111111111111111111111111111111111',
  listIds: new Set(['1']),
};
const destination: ERC20BridgeToken = {
  ...selected,
  address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
  name: 'Destination Token',
  symbol: 'DEST',
  decimals: 6,
};
const override: ERC20BridgeToken = {
  ...selected,
  address: '0x3333333333333333333333333333333333333333',
  name: 'Override Token',
  symbol: 'OVR',
};
function wrapper({
  sourceChain = ChainId.Ethereum,
  destinationChain = ChainId.ArbitrumOne,
  sourceToken = selected,
  destinationToken,
}: {
  sourceChain?: ChainId;
  destinationChain?: ChainId;
  sourceToken?: ERC20BridgeToken | null;
  destinationToken?: string | null;
} = {}) {
  return createBridgeTestWrapper({
    query: { sourceChain, destinationChain, token: sourceToken?.address, destinationToken },
    bridgeTokens: {
      [destination.address]: destination,
      ...(sourceToken ? { [sourceToken.address]: sourceToken } : {}),
    },
    cacheEntries: [
      [
        [
          sourceToken?.address,
          sourceChain,
          destinationChain,
          destinationChain,
          'useSelectedToken_usdc',
        ],
        sourceToken,
      ],
    ],
  });
}
describe.sequential('useDestinationToken', () => {
  beforeEach(() => {
    vi.mocked(getTokenOverride).mockReset().mockReturnValue({ source: null, destination: null });
  });
  it.each([undefined, '0x80e0e24718dbfcad49ecaa6f1e6c89a190586ca8'])(
    'resolves saved Ethereum USDC to ETH despite canonical mapping %s',
    async (l2Address) => {
      const sourceToken = { ...selected, address: CommonAddress.Ethereum.USDC, l2Address };
      const { result } = renderHook(
        () => ({ token: useDestinationToken(), isSwap: useIsSwapTransfer() }),
        {
          wrapper: wrapper({
            destinationChain: ChainId.RobinhoodChain,
            sourceToken,
            destinationToken: sourceToken.address,
          }),
        },
      );
      await waitFor(() => expect(result.current).toEqual({ token: null, isSwap: true }));
    },
  );
  it('preserves an explicit destination override for a source-only token', () => {
    vi.mocked(getTokenOverride).mockReturnValue({ source: null, destination: override });
    const { result } = renderHook(useDestinationToken, {
      wrapper: wrapper({
        sourceToken: { ...selected, lifiOnlyChainId: ChainId.Ethereum },
        destinationToken: selected.address,
      }),
    });
    expect(result.current).toEqual(override);
  });
  it('keeps override metadata stable across rerenders', () => {
    vi.mocked(getTokenOverride).mockImplementation(() => ({
      source: null,
      destination: { ...override },
    }));
    const { result, rerender } = renderHook(useDestinationToken, {
      wrapper: wrapper({
        sourceToken: { ...selected, lifiOnlyChainId: ChainId.Ethereum },
        destinationToken: selected.address,
      }),
    });
    const firstToken = result.current;
    rerender();
    expect(result.current).toBe(firstToken);
  });
  it('resolves source-only USDC to native ETH as a swap', () => {
    const sourceToken = { ...selected, symbol: 'USDC', lifiOnlyChainId: ChainId.ArbitrumOne };
    const { result } = renderHook(
      () => ({ token: useDestinationToken(), isSwap: useIsSwapTransfer() }),
      {
        wrapper: wrapper({
          sourceChain: ChainId.ArbitrumOne,
          destinationChain: ChainId.RobinhoodChain,
          sourceToken,
          destinationToken: sourceToken.address,
        }),
      },
    );
    expect(result.current).toEqual({ token: null, isSwap: true });
  });
  it('returns the selected token for the same destination', () => {
    const { result } = renderHook(useDestinationToken, {
      wrapper: wrapper({ destinationToken: selected.address }),
    });
    expect(result.current).toEqual(selected);
  });
  it('returns null without a source token', () => {
    const { result } = renderHook(useDestinationToken, {
      wrapper: wrapper({ sourceToken: null, destinationToken: undefined }),
    });
    expect(result.current).toBeNull();
  });
  it.each([ChainId.Ethereum, ChainId.ApeChain])(
    'resolves a native-token override from %s',
    (sourceChain) => {
      vi.mocked(getTokenOverride).mockReturnValue({ source: null, destination: override });
      const { result } = renderHook(useDestinationToken, {
        wrapper: wrapper({ sourceChain, destinationToken: constants.AddressZero }),
      });
      expect(result.current).toEqual(override);
      expect(getTokenOverride).toHaveBeenCalledWith({
        fromToken: constants.AddressZero,
        sourceChainId: sourceChain,
        destinationChainId: ChainId.ArbitrumOne,
      });
    },
  );
  it.each([destination.address, `0x${destination.address.slice(2).toUpperCase()}`])(
    'looks up destination %s',
    (destinationToken) => {
      const { result } = renderHook(useDestinationToken, {
        wrapper: wrapper({ destinationToken }),
      });
      expect(result.current).toEqual(destination);
    },
  );
  it.each(['0x4444444444444444444444444444444444444444', null, undefined, ''])(
    'returns null for an unavailable destination %s',
    (destinationToken) => {
      const { result } = renderHook(useDestinationToken, {
        wrapper: wrapper({ destinationToken }),
      });
      expect(result.current).toBeNull();
    },
  );
});
