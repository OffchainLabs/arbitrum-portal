import { renderHook } from '@testing-library/react';
import { BigNumber, constants } from 'ethers';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getProviderForChainId } from '@/token-bridge-sdk/utils';

import { ChainId } from '../../types/ChainId';
import { getArbitrumOnePyusdOftToken, getEthereumPyusdToken } from '../../util/PyusdUtils';
import { getWagmiChain } from '../../util/wagmi/getWagmiChain';
import { useArbQueryParams } from '../useArbQueryParams';
import { useBalance } from '../useBalance';
import { useBalanceOnDestinationChain } from '../useBalanceOnDestinationChain';
import { useNativeCurrency } from '../useNativeCurrency';
import { useNetworks } from '../useNetworks';
import { useNetworksRelationship } from '../useNetworksRelationship';

vi.mock('../useBalance', () => ({
  useBalance: vi.fn(),
}));

vi.mock('../useNativeCurrency', () => ({
  useNativeCurrency: vi.fn(),
}));

vi.mock('../useNetworks', () => ({
  useNetworks: vi.fn(),
}));

vi.mock('../useNetworksRelationship', () => ({
  useNetworksRelationship: vi.fn(),
}));

vi.mock('../useArbQueryParams', () => ({
  useArbQueryParams: vi.fn(),
}));

vi.mock('../../components/TransferPanel/TransferPanelMain/useNativeCurrencyBalances', () => ({
  useNativeCurrencyBalances: () => ({
    sourceBalance: constants.Zero,
    destinationBalance: constants.Zero,
  }),
}));

vi.mock('wagmi', async () => ({
  ...(await vi.importActual('wagmi')),
  useAccount: () => ({
    address: '0x00000000000000000000000000000000000000aa',
  }),
}));

describe('useBalanceOnDestinationChain', () => {
  const mockedUseBalance = vi.mocked(useBalance);
  const mockedUseNativeCurrency = vi.mocked(useNativeCurrency);
  const mockedUseNetworks = vi.mocked(useNetworks);
  const mockedUseNetworksRelationship = vi.mocked(useNetworksRelationship);
  const mockedUseArbQueryParams = vi.mocked(useArbQueryParams);

  beforeEach(() => {
    mockedUseArbQueryParams.mockReturnValue([
      {
        sourceChain: ChainId.Ethereum,
        destinationChain: ChainId.ArbitrumOne,
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
      },
      vi.fn(),
    ]);
    mockedUseNativeCurrency.mockReturnValue({
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
      isCustom: false,
    });
  });

  it('uses the child-chain token address for PYUSD deposits even when destinationBalanceAddress points to L1', () => {
    const token = {
      ...getEthereumPyusdToken(),
      l2Address: '0x46850ad61c2b7d64d08c9c754f45254596696984',
    };

    mockedUseNetworks.mockReturnValue([
      {
        sourceChain: getWagmiChain(ChainId.Ethereum),
        sourceChainProvider: getProviderForChainId(ChainId.Ethereum),
        destinationChain: getWagmiChain(ChainId.ArbitrumOne),
        destinationChainProvider: getProviderForChainId(ChainId.ArbitrumOne),
      },
      vi.fn(),
    ]);
    mockedUseNetworksRelationship.mockReturnValue({
      childChain: getWagmiChain(ChainId.ArbitrumOne),
      childChainProvider: getProviderForChainId(ChainId.ArbitrumOne),
      parentChain: getWagmiChain(ChainId.Ethereum),
      parentChainProvider: getProviderForChainId(ChainId.Ethereum),
      isDepositMode: true,
      isTeleportMode: false,
      isLifi: false,
    });
    mockedUseBalance.mockReturnValue({
      erc20: [
        {
          [token.l2Address.toLowerCase()]: BigNumber.from(42),
          [token.destinationBalanceAddress!.toLowerCase()]: BigNumber.from(0),
        },
        vi.fn(),
      ],
      eth: [constants.Zero, vi.fn()],
    });

    const { result } = renderHook(() => useBalanceOnDestinationChain(token));

    expect(result.current).toEqual(BigNumber.from(42));
  });

  it('still uses destinationBalanceAddress for PYUSD withdrawals back to Ethereum', () => {
    const token = getArbitrumOnePyusdOftToken();

    mockedUseNetworks.mockReturnValue([
      {
        sourceChain: getWagmiChain(ChainId.ArbitrumOne),
        sourceChainProvider: getProviderForChainId(ChainId.ArbitrumOne),
        destinationChain: getWagmiChain(ChainId.Ethereum),
        destinationChainProvider: getProviderForChainId(ChainId.Ethereum),
      },
      vi.fn(),
    ]);
    mockedUseNetworksRelationship.mockReturnValue({
      childChain: getWagmiChain(ChainId.ArbitrumOne),
      childChainProvider: getProviderForChainId(ChainId.ArbitrumOne),
      parentChain: getWagmiChain(ChainId.Ethereum),
      parentChainProvider: getProviderForChainId(ChainId.Ethereum),
      isDepositMode: false,
      isTeleportMode: false,
      isLifi: false,
    });
    mockedUseBalance.mockReturnValue({
      erc20: [
        {
          [token.destinationBalanceAddress!.toLowerCase()]: BigNumber.from(99),
        },
        vi.fn(),
      ],
      eth: [constants.Zero, vi.fn()],
    });

    const { result } = renderHook(() => useBalanceOnDestinationChain(token));
    expect(result.current).toEqual(BigNumber.from(99));
  });
});
