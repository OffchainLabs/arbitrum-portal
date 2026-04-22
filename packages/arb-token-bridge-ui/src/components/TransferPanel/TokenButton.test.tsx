import { render, screen } from '@testing-library/react';
import React from 'react';
import { DecodedValueMap } from 'use-query-params';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { queryParamProviderOptions, useArbQueryParams } from '../../hooks/useArbQueryParams';
import { useNativeCurrency } from '../../hooks/useNativeCurrency';
import { UseNetworksState, useNetworks } from '../../hooks/useNetworks';
import { useNetworksRelationship } from '../../hooks/useNetworksRelationship';
import { useSelectedToken } from '../../hooks/useSelectedToken';
import { useTokenLists } from '../../hooks/useTokenLists';
import { ChainId } from '../../types/ChainId';
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

vi.mock('../../hooks/useTokenLists', () => ({
  useTokenLists: vi.fn(),
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
  const mockedUseTokenLists = vi.mocked(useTokenLists);
  const mockedUseArbQueryParams = vi.mocked(useArbQueryParams);
  const mockedUseNativeCurrency = vi.mocked(useNativeCurrency);

  beforeEach(() => {
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
    mockedUseTokenLists.mockReturnValue({
      data: [],
      error: undefined,
      isLoading: false,
      isValidating: false,
      mutate: vi.fn(),
    } as never);
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

  it('shows the source-chain native asset when no ERC20 token is resolved', () => {
    render(<TokenButton />);

    expect(screen.getByRole('button', { name: 'Select Token' }).textContent).toContain('ETH');
  });
});
