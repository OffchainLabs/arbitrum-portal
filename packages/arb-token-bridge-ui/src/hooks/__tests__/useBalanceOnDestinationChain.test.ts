import { renderHook } from '@testing-library/react';
import { BigNumber, constants } from 'ethers';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getProviderForChainId } from '@/token-bridge-sdk/utils';

import { ChainId } from '../../types/ChainId';
import { CommonAddress } from '../../util/CommonAddressUtils';
import { getArbitrumOnePyusdToken } from '../../util/PyusdUtils';
import { getWagmiChain } from '../../util/wagmi/getWagmiChain';
import { ERC20BridgeToken, TokenType } from '../arbTokenBridge.types';
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

  it('uses the destination-chain token address for PYUSD deposits', () => {
    const token = getArbitrumOnePyusdToken();

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
          [token.address.toLowerCase()]: BigNumber.from(42),
        },
        vi.fn(),
      ],
      eth: [constants.Zero, vi.fn()],
    });

    const { result } = renderHook(() => useBalanceOnDestinationChain(token));

    expect(result.current).toEqual(BigNumber.from(42));
  });

  it('uses l2Address for destination override tokens in deposit mode', () => {
    const token: ERC20BridgeToken = {
      type: TokenType.ERC20,
      address: CommonAddress.Superposition.USDCe,
      importLookupAddress: CommonAddress.Ethereum.USDC,
      l2Address: CommonAddress.Superposition.USDCe,
      symbol: 'USDC.e',
      name: 'Bridged USDC',
      decimals: 6,
      listIds: new Set<string>(),
    };

    mockedUseNetworks.mockReturnValue([
      {
        sourceChain: getWagmiChain(ChainId.Ethereum),
        sourceChainProvider: getProviderForChainId(ChainId.Ethereum),
        destinationChain: getWagmiChain(ChainId.Superposition),
        destinationChainProvider: getProviderForChainId(ChainId.Superposition),
      },
      vi.fn(),
    ]);
    mockedUseNetworksRelationship.mockReturnValue({
      childChain: getWagmiChain(ChainId.Superposition),
      childChainProvider: getProviderForChainId(ChainId.Superposition),
      parentChain: getWagmiChain(ChainId.Ethereum),
      parentChainProvider: getProviderForChainId(ChainId.Ethereum),
      isDepositMode: true,
      isTeleportMode: false,
      isLifi: false,
    });
    mockedUseBalance.mockReturnValue({
      erc20: [
        {
          [CommonAddress.Superposition.USDCe]: BigNumber.from(7),
        },
        vi.fn(),
      ],
      eth: [constants.Zero, vi.fn()],
    });

    const { result } = renderHook(() => useBalanceOnDestinationChain(token));

    expect(result.current).toEqual(BigNumber.from(7));
  });

  it('uses l2Address for ApeChain WETH destination overrides in deposit mode', () => {
    const token: ERC20BridgeToken = {
      type: TokenType.ERC20,
      address: CommonAddress.ApeChain.WETH,
      l2Address: CommonAddress.ApeChain.WETH,
      symbol: 'WETH',
      name: 'Wrapped Ether',
      decimals: 18,
      listIds: new Set<string>(),
    };

    mockedUseNetworks.mockReturnValue([
      {
        sourceChain: getWagmiChain(ChainId.ArbitrumOne),
        sourceChainProvider: getProviderForChainId(ChainId.ArbitrumOne),
        destinationChain: getWagmiChain(ChainId.ApeChain),
        destinationChainProvider: getProviderForChainId(ChainId.ApeChain),
      },
      vi.fn(),
    ]);
    mockedUseNetworksRelationship.mockReturnValue({
      childChain: getWagmiChain(ChainId.ApeChain),
      childChainProvider: getProviderForChainId(ChainId.ApeChain),
      parentChain: getWagmiChain(ChainId.ArbitrumOne),
      parentChainProvider: getProviderForChainId(ChainId.ArbitrumOne),
      isDepositMode: true,
      isTeleportMode: false,
      isLifi: false,
    });
    mockedUseBalance.mockReturnValue({
      erc20: [
        {
          [CommonAddress.ApeChain.WETH.toLowerCase()]: BigNumber.from(13),
        },
        vi.fn(),
      ],
      eth: [constants.Zero, vi.fn()],
    });

    const { result } = renderHook(() => useBalanceOnDestinationChain(token));

    expect(result.current).toEqual(BigNumber.from(13));
  });

  it('still uses destinationBalanceAddress for PYUSD withdrawals back to Ethereum', () => {
    const token = getArbitrumOnePyusdToken();
    const destinationBalanceAddress = token.destinationBalanceAddress?.toLowerCase();

    if (!destinationBalanceAddress) {
      throw new Error('Expected PYUSD token to expose destinationBalanceAddress');
    }

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
          [destinationBalanceAddress]: BigNumber.from(99),
        },
        vi.fn(),
      ],
      eth: [constants.Zero, vi.fn()],
    });

    const { result } = renderHook(() => useBalanceOnDestinationChain(token));
    expect(result.current).toEqual(BigNumber.from(99));
  });
});
