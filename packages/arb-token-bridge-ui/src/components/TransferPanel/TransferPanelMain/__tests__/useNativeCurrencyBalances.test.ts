import { renderHook } from '@testing-library/react';
import { BigNumber } from 'ethers';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { getProviderForChainId } from '@/token-bridge-sdk/utils';

import { useBalances } from '../../../../hooks/useBalances';
import { useNativeCurrency } from '../../../../hooks/useNativeCurrency';
import { useNetworks } from '../../../../hooks/useNetworks';
import { ChainId } from '../../../../types/ChainId';
import { CommonAddress } from '../../../../util/CommonAddressUtils';
import { getWagmiChain } from '../../../../util/wagmi/getWagmiChain';
import { useNativeCurrencyBalances } from '../useNativeCurrencyBalances';

vi.mock('../../../../hooks/useNetworks', () => ({
  useNetworks: vi.fn(),
}));

vi.mock('../../../../hooks/useBalances', () => ({
  useBalances: vi.fn(),
}));

vi.mock('../../../../hooks/useNativeCurrency', () => ({
  useNativeCurrency: vi.fn(),
}));

vi.mock('../../../../hooks/useArbQueryParams', () => ({
  useArbQueryParams: () => [{ destinationAddress: undefined }],
}));

vi.mock('wagmi', async () => ({
  ...(await vi.importActual('wagmi')),
  useAccount: () => ({
    isConnected: true,
  }),
}));

describe('useNativeCurrencyBalances', () => {
  const mockedUseNetworks = vi.mocked(useNetworks);
  const mockedUseBalances = vi.mocked(useBalances);
  const mockedUseNativeCurrency = vi.mocked(useNativeCurrency);

  beforeEach(() => {
    mockedUseNativeCurrency.mockReturnValue({
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
      isCustom: false,
    });
  });

  beforeAll(() => {
    mockedUseBalances.mockReturnValue({
      ethParentBalance: BigNumber.from(100_000),
      erc20ParentBalances: {
        '0x123': BigNumber.from(200_000),
        '0x222': BigNumber.from(250_000_000),
        [CommonAddress.RobinhoodChain.APE]: BigNumber.from(500_000),
      },
      ethChildBalance: BigNumber.from(300_000),
      erc20ChildBalances: { '0x234': BigNumber.from(400_000) },
      updateEthChildBalance: vi.fn(),
      updateEthParentBalance: vi.fn(),
      updateErc20ParentBalances: vi.fn(),
      updateErc20ChildBalances: vi.fn(),
    });
  });

  it('should return ETH parent balance as source balance and ETH child balance as destination balance when wallet is connected, destination address is the same as connected wallet, and source chain is Sepolia and destination chain is Arbitrum Sepolia', () => {
    mockedUseNetworks.mockReturnValue([
      {
        sourceChain: getWagmiChain(ChainId.Sepolia),
        sourceChainProvider: getProviderForChainId(ChainId.Sepolia),
        destinationChain: getWagmiChain(ChainId.ArbitrumSepolia),
        destinationChainProvider: getProviderForChainId(ChainId.ArbitrumSepolia),
      },
      vi.fn(),
    ]);

    const { result } = renderHook(useNativeCurrencyBalances);
    expect(result.current).toEqual({
      sourceBalance: BigNumber.from(100_000),
      destinationBalance: BigNumber.from(300_000),
    });
  });

  it('uses the Robinhood APE balance for Robinhood to ApeChain transfers', () => {
    mockedUseNetworks.mockReturnValue([
      {
        sourceChain: getWagmiChain(ChainId.RobinhoodChain),
        sourceChainProvider: getProviderForChainId(ChainId.RobinhoodChain),
        destinationChain: getWagmiChain(ChainId.ApeChain),
        destinationChainProvider: getProviderForChainId(ChainId.ApeChain),
      },
      vi.fn(),
    ]);
    mockedUseNativeCurrency.mockReturnValue({
      name: 'ApeCoin',
      symbol: 'APE',
      decimals: 18,
      address: CommonAddress.RobinhoodChain.APE,
      isCustom: true,
    });

    const { result } = renderHook(useNativeCurrencyBalances);

    expect(result.current).toEqual({
      sourceBalance: BigNumber.from(500_000),
      destinationBalance: BigNumber.from(300_000),
    });
  });
});
