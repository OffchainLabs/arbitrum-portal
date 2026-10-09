import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { BigNumber, constants } from 'ethers';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useRouteStore } from '../../components/TransferPanel/hooks/useRouteStore';
import { createBridgeTestWrapper } from '../../test-utils/bridge-test-wrapper';
import { ChainId } from '../../types/ChainId';
import { CommonAddress } from '../../util/CommonAddressUtils';
import { defaultWalletContextValue } from '../../wallet/WalletContext';
import { useGasEstimates } from '../TransferPanel/useGasEstimates';
import { type ERC20BridgeToken, TokenType } from '../arbTokenBridge.types';
import { useDestinationSelection } from '../useDestinationToken';

const ethereumUsdc: ERC20BridgeToken = {
  type: TokenType.ERC20,
  decimals: 6,
  name: 'USD Coin',
  symbol: 'USDC',
  address: CommonAddress.Ethereum.USDC,
  l2Address: '0x80e0e24718dbfcad49ecaa6f1e6c89a190586ca8',
  listIds: new Set(['1']),
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  useRouteStore.getState().clearRoute();
  useRouteStore.setState({ eligibleRouteTypes: [] });
});

describe.sequential('useGasEstimates', () => {
  it.each([
    {
      description: 'quotes the resolved native destination for saved USDC with a canonical mapping',
      destinationChainId: ChainId.RobinhoodChain,
      sourceToken: ethereumUsdc,
      expectedToToken: constants.AddressZero,
    },
    {
      description: 'keeps quoting the mapped token when the destination still receives it',
      destinationChainId: ChainId.ArbitrumOne,
      sourceToken: {
        ...ethereumUsdc,
        address: '0x0000000000000000000000000000000000000002',
        name: 'Test token',
        symbol: 'TEST',
      },
      expectedToToken: ethereumUsdc.l2Address,
    },
  ])('$description', async ({ destinationChainId, sourceToken, expectedToToken }) => {
    const fetchRoute = vi
      .fn<typeof fetch>()
      .mockImplementation(async () => new Response(JSON.stringify({ data: [] }), { status: 200 }));
    vi.stubGlobal('fetch', fetchRoute);
    useRouteStore.setState({ eligibleRouteTypes: ['lifi'], isLoading: false, routes: [] });

    const wrapper = createBridgeTestWrapper({
      query: {
        sourceChain: ChainId.Ethereum,
        destinationChain: destinationChainId,
        token: sourceToken.address,
        destinationToken: sourceToken.address,
      },
      wallets: {
        ...defaultWalletContextValue,
        evm: {
          ...defaultWalletContextValue.evm,
          isConnected: true,
          account: {
            ecosystem: 'evm',
            address: '0x1111111111111111111111111111111111111111',
            chainId: ChainId.Ethereum,
            status: 'connected',
          },
        },
      },
      fetchBalance: async () => ({ [sourceToken.address]: 1_000_000n }),
      bridgeTokens: { [sourceToken.address]: sourceToken },
      cacheEntries: [
        [
          [
            sourceToken.address,
            ChainId.Ethereum,
            destinationChainId,
            destinationChainId,
            'useSelectedToken_usdc',
          ],
          sourceToken,
        ],
      ],
    });
    const { result } = renderHook(
      () => {
        useGasEstimates({
          sourceChainErc20Address: sourceToken.address,
          destinationChainErc20Address: sourceToken.l2Address,
          amount: BigNumber.from(1),
        });
        return useDestinationSelection().destinationAddress;
      },
      { wrapper },
    );

    await waitFor(() => {
      const requests = fetchRoute.mock.calls
        .map(([input]) => new URL(String(input), 'http://localhost'))
        .filter((url) => url.pathname === '/api/crosschain-transfers/lifi');
      expect(requests.length).toBeGreaterThan(0);
      expect(requests.at(-1)?.searchParams.get('toToken')).toBe(expectedToToken);
    });
    expect(result.current).toBe(expectedToToken);
  });
});
