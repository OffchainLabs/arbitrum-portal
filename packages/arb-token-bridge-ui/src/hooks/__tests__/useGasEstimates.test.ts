import { renderHook } from '@testing-library/react';
import { BigNumber, constants } from 'ethers';
import { DecodedValueMap } from 'use-query-params';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getTokenOverride } from '../../app/api/crosschain-transfers/utils';
import { Context, useAppState } from '../../state';
import { ChainId } from '../../types/ChainId';
import { CommonAddress } from '../../util/CommonAddressUtils';
import { getWagmiChain } from '../../util/wagmi/getWagmiChain';
import { useGasEstimates } from '../TransferPanel/useGasEstimates';
import { ERC20BridgeToken, TokenType } from '../arbTokenBridge.types';
import { queryParamProviderOptions, useArbQueryParams } from '../useArbQueryParams';
import { useDestinationSelection } from '../useDestinationToken';
import { useLifiCrossTransfersRoute } from '../useLifiCrossTransferRoute';
import { useNetworks } from '../useNetworks';
import { useSelectedToken } from '../useSelectedToken';

type ArbQueryParams = DecodedValueMap<typeof queryParamProviderOptions.params>;

const defaultQueryParams: ArbQueryParams = {
  sourceChain: undefined,
  destinationChain: undefined,
  amount: '',
  amount2: '',
  destinationAddress: undefined,
  token: undefined,
  destinationToken: undefined,
  settingsOpen: false,
  tab: 0,
  disabledFeatures: [],
  theme: {},
  debugLevel: 'silent',
  experiments: undefined,
};

vi.mock('swr', () => ({
  default: vi.fn(() => ({ data: undefined, error: undefined })),
}));

vi.mock('wagmi', () => ({
  useAccount: vi.fn(() => ({ address: undefined })),
  useConfig: vi.fn(() => ({})),
}));

vi.mock('../useArbQueryParams', () => ({
  useArbQueryParams: vi.fn(),
}));

vi.mock('../useSelectedToken', () => ({
  useSelectedToken: vi.fn(),
}));

vi.mock('../useNetworks', () => ({
  useNetworks: vi.fn(),
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

vi.mock('../../state', () => ({
  useAppState: vi.fn(),
}));

vi.mock('../../app/api/crosschain-transfers/utils', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../app/api/crosschain-transfers/utils')>()),
  getTokenOverride: vi.fn(() => ({ source: null, destination: null })),
}));

describe('useGasEstimates', () => {
  const mockedUseArbQueryParams = vi.mocked(useArbQueryParams);
  const mockedUseSelectedToken = vi.mocked(useSelectedToken);
  const mockedUseNetworks = vi.mocked(useNetworks);
  const mockedUseAppState = vi.mocked(useAppState);
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
    mockedUseArbQueryParams.mockReturnValue([
      { ...defaultQueryParams, destinationToken: ethereumUsdc.address },
      vi.fn(),
    ]);
    mockedUseAppState.mockReturnValue({
      app: { arbTokenBridge: { bridgeTokens: {} } },
    } as Context['state']);
  });

  function setNetworks(destinationChainId: ChainId) {
    mockedUseNetworks.mockReturnValue([
      {
        sourceChain: getWagmiChain(ChainId.Ethereum),
        destinationChain: getWagmiChain(destinationChainId),
      },
      vi.fn(),
    ] as unknown as ReturnType<typeof useNetworks>);
  }

  function renderGasEstimates() {
    return renderHook(() => {
      useGasEstimates({
        sourceChainErc20Address: ethereumUsdc.address,
        destinationChainErc20Address: ethereumUsdc.l2Address,
        amount: BigNumber.from(1),
      });
      return useDestinationSelection().destinationAddress;
    });
  }

  it('quotes the resolved native destination for saved USDC with a canonical mapping', () => {
    setNetworks(ChainId.RobinhoodChain);

    const { result } = renderGasEstimates();

    expect(result.current).toBe(constants.AddressZero);
    expect(mockedUseLifiCrossTransfersRoute).toHaveBeenLastCalledWith(
      expect.objectContaining({ enabled: true, toToken: constants.AddressZero }),
    );
  });

  it('keeps quoting the mapped token when the destination still receives it', () => {
    setNetworks(ChainId.ArbitrumOne);

    const { result } = renderGasEstimates();

    expect(result.current).toBe(ethereumUsdc.l2Address);
    expect(mockedUseLifiCrossTransfersRoute).toHaveBeenLastCalledWith(
      expect.objectContaining({ toToken: ethereumUsdc.l2Address }),
    );
  });
});
