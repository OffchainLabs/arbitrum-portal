import { registerCustomArbitrumNetwork } from '@arbitrum/sdk';
import { cleanup, renderHook } from '@testing-library/react';
import { BigNumber, constants } from 'ethers';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { getTokenOverride } from '../../app/api/crosschain-transfers/utils';
import { createBridgeTestWrapper } from '../../test-utils/bridge-test-wrapper';
import { ChainId } from '../../types/ChainId';
import { CommonAddress } from '../../util/CommonAddressUtils';
import { orbitMainnets } from '../../util/orbitChainsList';
import { useGasEstimates } from '../TransferPanel/useGasEstimates';
import { ERC20BridgeToken, TokenType } from '../arbTokenBridge.types';
import { useDestinationSelection } from '../useDestinationToken';
import { useLifiCrossTransfersRoute } from '../useLifiCrossTransferRoute';
import { useSelectedToken } from '../useSelectedToken';

vi.mock('swr', async (importOriginal) => ({
  ...(await importOriginal<typeof import('swr')>()),
  default: vi.fn(() => ({ data: undefined, error: undefined })),
}));

vi.mock('../useSelectedToken', () => ({
  useSelectedToken: vi.fn(),
}));

vi.mock('../useNetworksRelationship', () => ({
  useNetworksRelationship: vi.fn(() => ({ isDepositMode: true })),
}));

vi.mock('../useBalanceOnSourceChain', () => ({
  useBalanceOnSourceChain: vi.fn(() => null),
}));

vi.mock('../useLifiCrossTransferRoute', () => ({
  useLifiCrossTransfersRoute: vi.fn(() => ({ data: undefined, isLoading: false })),
}));

vi.mock('../../components/TransferPanel/hooks/useRouteStore', () => ({
  useRouteStore: vi.fn((selector) => selector({ eligibleRouteTypes: ['lifi'] })),
  getSelectedRouteContext: vi.fn(() => undefined),
}));

vi.mock('../../components/TransferPanel/hooks/useLifiSettingsStore', () => ({
  useLifiSettingsStore: vi.fn((selector) =>
    selector({ disabledBridges: [], disabledExchanges: [], slippage: '0.5' }),
  ),
}));

vi.mock('../../components/TransferPanel/TokenSearchUtils', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../components/TransferPanel/TokenSearchUtils')>()),
  useTokensFromLists: () => ({ data: {}, isLoading: false }),
}));

vi.mock('../../app/api/crosschain-transfers/utils', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../app/api/crosschain-transfers/utils')>()),
  getTokenOverride: vi.fn(() => ({ source: null, destination: null })),
}));

beforeAll(() => {
  const network = orbitMainnets[ChainId.RobinhoodChain];
  if (!network) throw new Error('Missing Robinhood Chain fixture');
  registerCustomArbitrumNetwork(network);
});
afterEach(cleanup);

describe.sequential('useGasEstimates', () => {
  const mockedUseSelectedToken = vi.mocked(useSelectedToken);
  const mockedUseLifiCrossTransfersRoute = vi.mocked(useLifiCrossTransfersRoute);

  const ethereumUsdc: ERC20BridgeToken = {
    type: TokenType.ERC20,
    decimals: 6,
    name: 'USD Coin',
    symbol: 'USDC',
    address: CommonAddress.Ethereum.USDC,
    l2Address: '0x80e0e24718dbfcad49ecaa6f1e6c89a190586ca8',
    listIds: new Set(['1']),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getTokenOverride).mockReturnValue({ source: null, destination: null });
    mockedUseSelectedToken.mockReturnValue([ethereumUsdc, vi.fn()]);
  });

  function renderGasEstimates(destinationChainId: ChainId) {
    return renderHook(
      () => {
        useGasEstimates({
          sourceChainErc20Address: ethereumUsdc.address,
          destinationChainErc20Address: ethereumUsdc.l2Address,
          amount: BigNumber.from(1),
        });
        return useDestinationSelection().destinationAddress;
      },
      {
        wrapper: createBridgeTestWrapper({
          query: {
            sourceChain: ChainId.Ethereum,
            destinationChain: destinationChainId,
            destinationToken: ethereumUsdc.address,
          },
        }),
      },
    );
  }

  it('quotes the resolved native destination for saved USDC with a canonical mapping', () => {
    const { result } = renderGasEstimates(ChainId.RobinhoodChain);

    expect(result.current).toBe(constants.AddressZero);
    expect(mockedUseLifiCrossTransfersRoute).toHaveBeenLastCalledWith(
      expect.objectContaining({ enabled: true, toToken: constants.AddressZero }),
    );
  });

  it('keeps quoting the mapped token when the destination still receives it', () => {
    const { result } = renderGasEstimates(ChainId.ArbitrumOne);

    expect(result.current).toBe(ethereumUsdc.l2Address);
    expect(mockedUseLifiCrossTransfersRoute).toHaveBeenLastCalledWith(
      expect.objectContaining({ toToken: ethereumUsdc.l2Address }),
    );
  });
});
