import { render, screen } from '@testing-library/react';
import React from 'react';
import { DecodedValueMap } from 'use-query-params';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TokenType } from '../../hooks/arbTokenBridge.types';
import { queryParamProviderOptions, useArbQueryParams } from '../../hooks/useArbQueryParams';
import { useNativeCurrency } from '../../hooks/useNativeCurrency';
import { UseNetworksState, useNetworks } from '../../hooks/useNetworks';
import { useNetworksRelationship } from '../../hooks/useNetworksRelationship';
import { useSelectedToken } from '../../hooks/useSelectedToken';
import { ChainId } from '../../types/ChainId';
import { CommonAddress } from '../../util/CommonAddressUtils';
import { getWagmiChain } from '../../util/wagmi/getWagmiChain';
import { TokenButton } from './TokenButton';

vi.mock('../../hooks/useSelectedToken', () => ({
  useSelectedToken: vi.fn(),
}));

vi.mock('../../hooks/useNetworks', () => ({
  useNetworks: vi.fn(),
}));

vi.mock('../../hooks/useNetworksRelationship', () => ({
  useNetworksRelationship: vi.fn(),
}));

vi.mock('../../hooks/useArbQueryParams', () => ({
  useArbQueryParams: vi.fn(),
  queryParamProviderOptions: {
    params: {},
  },
}));

vi.mock('../../hooks/useNativeCurrency', () => ({
  useNativeCurrency: vi.fn(),
}));

vi.mock('../common/Dialog2', () => ({
  DialogWrapper: () => null,
  useDialog2: () => [{ openedDialogType: null }, vi.fn()],
}));

vi.mock('./TokenLogo', () => ({
  TokenLogo: () => <div data-testid="token-logo" />,
}));

vi.mock('../common/atoms/Loader', () => ({
  Loader: () => <div data-testid="loader" />,
}));

let tokensFromListsValue: Record<string, { symbol: string; address: string }> = {};
let tokensFromUserValue: Record<string, { symbol: string; address: string }> = {};

vi.mock('./TokenSearchUtils', () => ({
  useTokensFromLists: () => tokensFromListsValue,
  useTokensFromUser: () => tokensFromUserValue,
}));

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

function makeNetworksState(sourceChainId: ChainId, destinationChainId: ChainId): UseNetworksState {
  return {
    sourceChain: getWagmiChain(sourceChainId),
    sourceChainProvider: { chainId: sourceChainId, label: 'source' } as never,
    destinationChain: getWagmiChain(destinationChainId),
    destinationChainProvider: { chainId: destinationChainId, label: 'destination' } as never,
  };
}

describe('TokenButton', () => {
  const mockedUseSelectedToken = vi.mocked(useSelectedToken);
  const mockedUseNetworks = vi.mocked(useNetworks);
  const mockedUseNetworksRelationship = vi.mocked(useNetworksRelationship);
  const mockedUseArbQueryParams = vi.mocked(useArbQueryParams);
  const mockedUseNativeCurrency = vi.mocked(useNativeCurrency);

  beforeEach(() => {
    tokensFromListsValue = {};
    tokensFromUserValue = {};

    const networks = makeNetworksState(ChainId.ArbitrumOne, ChainId.ApeChain);

    mockedUseSelectedToken.mockReturnValue([null, vi.fn()]);
    mockedUseNetworks.mockReturnValue([networks, vi.fn()]);
    mockedUseNetworksRelationship.mockReturnValue({
      childChain: networks.destinationChain,
      childChainProvider: networks.destinationChainProvider,
      parentChain: networks.sourceChain,
      parentChainProvider: networks.sourceChainProvider,
      isDepositMode: true,
      isTeleportMode: false,
      isLifi: true,
    });
    mockedUseArbQueryParams.mockReturnValue([
      {
        ...defaultQueryParams,
        token: '0x0000000000000000000000000000000000000000',
      },
      vi.fn(),
    ]);
    mockedUseNativeCurrency.mockImplementation(({ provider }) =>
      provider === networks.sourceChainProvider
        ? {
            name: 'Ether',
            symbol: 'ETH',
            decimals: 18,
            isCustom: false,
          }
        : {
            name: 'ApeCoin',
            symbol: 'APE',
            decimals: 18,
            isCustom: true,
            address: '0xape',
          },
    );
  });

  it('shows the child-chain native asset when no ERC20 token is resolved', () => {
    mockedUseArbQueryParams.mockReturnValue([
      {
        ...defaultQueryParams,
        token: undefined,
      },
      vi.fn(),
    ]);

    const { container } = render(<TokenButton />);

    expect(container.textContent).toContain('APE');
  });

  it('shows a loader for a valid token query until a token object resolves', () => {
    mockedUseArbQueryParams.mockReturnValue([
      {
        ...defaultQueryParams,
        token: '0xaf88d065e77c8cc2239327c5edb3a432268e5831',
      },
      vi.fn(),
    ]);

    const { container } = render(<TokenButton />);

    expect(screen.getByTestId('loader')).toBeTruthy();
    expect(container.textContent).not.toContain('APE');
    expect(container.textContent).not.toContain('ETH');
  });

  it('shows the token from list fallback when selectedToken has not resolved yet', () => {
    mockedUseArbQueryParams.mockReturnValue([
      {
        ...defaultQueryParams,
        token: CommonAddress.ArbitrumOne.USDC,
      },
      vi.fn(),
    ]);
    tokensFromListsValue = {
      [CommonAddress.ArbitrumOne.USDC]: {
        type: TokenType.ERC20,
        symbol: 'USDC',
        name: 'USD Coin',
        decimals: 6,
        address: CommonAddress.ArbitrumOne.USDC,
        l2Address: CommonAddress.ApeChain.USDCe,
        listIds: new Set(['lifi-token-list']),
      },
    } as never;

    const { container } = render(<TokenButton />);

    expect(container.querySelector('[data-testid=\"loader\"]')).toBeNull();
    expect(container.textContent).toContain('USDC');
    expect(container.textContent).not.toContain('ETH');
  });
});
