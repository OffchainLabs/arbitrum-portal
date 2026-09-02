import { renderHook } from '@testing-library/react';
import { BigNumber, utils } from 'ethers';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getProviderForChainId } from '@/token-bridge-sdk/utils';

import { useGasSummary } from '../../../../hooks/TransferPanel/useGasSummary';
import { useSelectedTokenBalances } from '../../../../hooks/TransferPanel/useSelectedTokenBalances';
import { useNativeCurrency } from '../../../../hooks/useNativeCurrency';
import { useNetworks } from '../../../../hooks/useNetworks';
import { useSelectedToken } from '../../../../hooks/useSelectedToken';
import { ChainId } from '../../../../types/ChainId';
import { NOVA_MAX_ETH_DEPOSIT_AMOUNT } from '../../../../util/NovaUtils';
import { getWagmiChain } from '../../../../util/wagmi/getWagmiChain';
import { useMaxAmount } from '../useMaxAmount';
import { useNativeCurrencyBalances } from '../useNativeCurrencyBalances';

vi.mock('../../../../hooks/useNetworks', () => ({ useNetworks: vi.fn() }));
vi.mock('../../../../hooks/useSelectedToken', () => ({ useSelectedToken: vi.fn() }));
vi.mock('../../../../hooks/useNativeCurrency', () => ({ useNativeCurrency: vi.fn() }));
vi.mock('../../../../hooks/TransferPanel/useGasSummary', () => ({ useGasSummary: vi.fn() }));
vi.mock('../../../../hooks/TransferPanel/useSelectedTokenBalances', () => ({
  useSelectedTokenBalances: vi.fn(),
}));
vi.mock('../useNativeCurrencyBalances', () => ({ useNativeCurrencyBalances: vi.fn() }));
vi.mock('../../../../hooks/useSourceChainNativeCurrencyDecimals', () => ({
  useSourceChainNativeCurrencyDecimals: () => 18,
}));
vi.mock('../../../../hooks/useNetworksRelationship', () => ({
  useNetworksRelationship: (networks: { destinationChain: { id: number } }) => ({
    childChainProvider: getProviderForChainId(networks.destinationChain.id),
    // Ethereum -> Nova and Nova -> Arbitrum One are both deposits; Nova -> Ethereum is not
    isDepositMode: networks.destinationChain.id !== ChainId.Ethereum,
  }),
}));

function setNetworks(sourceChainId: ChainId, destinationChainId: ChainId) {
  vi.mocked(useNetworks).mockReturnValue([
    {
      sourceChain: getWagmiChain(sourceChainId),
      sourceChainProvider: getProviderForChainId(sourceChainId),
      destinationChain: getWagmiChain(destinationChainId),
      destinationChainProvider: getProviderForChainId(destinationChainId),
    },
    vi.fn(),
  ]);
}

// `vitest.config.ts` sets `sequence.concurrent`, and these tests share module-level mocks
describe.sequential('useMaxAmount', () => {
  beforeEach(() => {
    vi.mocked(useSelectedToken).mockReturnValue([null, vi.fn()]);
    vi.mocked(useNativeCurrency).mockReturnValue({
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
      isCustom: false,
    });
    vi.mocked(useSelectedTokenBalances).mockReturnValue({
      sourceBalance: null,
      destinationBalance: null,
    });
    // 1 ETH balance, negligible gas, so the unclamped max is just under 1
    vi.mocked(useNativeCurrencyBalances).mockReturnValue({
      sourceBalance: utils.parseEther('1'),
      destinationBalance: BigNumber.from(0),
    });
    vi.mocked(useGasSummary).mockReturnValue({
      status: 'success',
      estimatedParentChainGasFees: 0,
      estimatedChildChainGasFees: 0,
    });
  });

  it('clamps max to the Nova cap when depositing into Nova', () => {
    setNetworks(ChainId.Ethereum, ChainId.ArbitrumNova);

    const { result } = renderHook(useMaxAmount);

    expect(result.current.maxAmount).toBe(String(NOVA_MAX_ETH_DEPOSIT_AMOUNT));
  });

  it('does not clamp when the balance is already below the Nova cap', () => {
    setNetworks(ChainId.Ethereum, ChainId.ArbitrumNova);
    vi.mocked(useNativeCurrencyBalances).mockReturnValue({
      sourceBalance: utils.parseEther('0.001'),
      destinationBalance: BigNumber.from(0),
    });

    const { result } = renderHook(useMaxAmount);

    expect(Number(result.current.maxAmount)).toBe(0.001);
  });

  it('does not clamp when withdrawing from Nova to Ethereum', () => {
    setNetworks(ChainId.ArbitrumNova, ChainId.Ethereum);

    const { result } = renderHook(useMaxAmount);

    expect(Number(result.current.maxAmount)).toBe(1);
  });

  it('does not clamp when transferring from Nova to Arbitrum One', () => {
    setNetworks(ChainId.ArbitrumNova, ChainId.ArbitrumOne);

    const { result } = renderHook(useMaxAmount);

    expect(Number(result.current.maxAmount)).toBe(1);
  });

  it('does not clamp a regular Ethereum to Arbitrum One deposit', () => {
    setNetworks(ChainId.Ethereum, ChainId.ArbitrumOne);

    const { result } = renderHook(useMaxAmount);

    expect(Number(result.current.maxAmount)).toBe(1);
  });
});
