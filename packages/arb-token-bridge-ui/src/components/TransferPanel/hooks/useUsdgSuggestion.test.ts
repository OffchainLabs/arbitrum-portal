import { act, renderHook } from '@testing-library/react';
import { constants } from 'ethers';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ERC20BridgeToken, TokenType } from '../../../hooks/arbTokenBridge.types';
import { useArbQueryParams } from '../../../hooks/useArbQueryParams';
import { useDestinationToken } from '../../../hooks/useDestinationToken';
import { useNetworks } from '../../../hooks/useNetworks';
import { useSelectedToken } from '../../../hooks/useSelectedToken';
import { ChainId } from '../../../types/ChainId';
import { trackEvent } from '../../../util/AnalyticsUtils';
import { CommonAddress } from '../../../util/CommonAddressUtils';
import { useTokensFromLists } from '../TokenSearchUtils';
import { getUsdgSuggestion, useUsdgSuggestion } from './useUsdgSuggestion';

vi.mock('../../../hooks/useArbQueryParams', () => ({ useArbQueryParams: vi.fn() }));
vi.mock('../../../hooks/useDestinationToken', () => ({ useDestinationToken: vi.fn() }));
vi.mock('../../../hooks/useNetworks', () => ({ useNetworks: vi.fn() }));
vi.mock('../../../hooks/useSelectedToken', () => ({ useSelectedToken: vi.fn() }));
vi.mock('../../../util/AnalyticsUtils', () => ({ trackEvent: vi.fn() }));
vi.mock('../TokenSearchUtils', () => ({ useTokensFromLists: vi.fn() }));

describe('getUsdgSuggestion', () => {
  it('shows when a non-USDG stablecoin is the destination on Robinhood Chain', () => {
    expect(
      getUsdgSuggestion({
        destinationChainId: ChainId.RobinhoodChain,
        sourceTokenAddress: constants.AddressZero,
        destinationTokenAddress: CommonAddress.RobinhoodChain.USDe,
      }),
    ).toEqual({ isVisible: true, isDestinationStablecoin: true });
  });

  it('shows when a stablecoin source was pointed at native ETH', () => {
    expect(
      getUsdgSuggestion({
        destinationChainId: ChainId.RobinhoodChain,
        sourceTokenAddress: CommonAddress.ArbitrumOne.USDC,
        destinationTokenAddress: undefined,
      }),
    ).toEqual({ isVisible: true, isDestinationStablecoin: false });
    expect(
      getUsdgSuggestion({
        destinationChainId: ChainId.RobinhoodChain,
        sourceTokenAddress: CommonAddress.ArbitrumOne.USDC,
        destinationTokenAddress: constants.AddressZero,
      }),
    ).toEqual({ isVisible: true, isDestinationStablecoin: false });
  });

  it('stays hidden when a stablecoin source was pointed at another asset on purpose', () => {
    expect(
      getUsdgSuggestion({
        destinationChainId: ChainId.RobinhoodChain,
        sourceTokenAddress: CommonAddress.ArbitrumOne.USDC,
        destinationTokenAddress: CommonAddress.RobinhoodChain.APE,
      }),
    ).toEqual({ isVisible: false, isDestinationStablecoin: false });
  });

  it('stays hidden once USDG is the destination', () => {
    expect(
      getUsdgSuggestion({
        destinationChainId: ChainId.RobinhoodChain,
        sourceTokenAddress: CommonAddress.ArbitrumOne.USDC,
        destinationTokenAddress: CommonAddress.RobinhoodChain.USDG,
      }).isVisible,
    ).toBe(false);
    expect(
      getUsdgSuggestion({
        destinationChainId: ChainId.RobinhoodChain,
        sourceTokenAddress: CommonAddress.Ethereum.USDG,
        destinationTokenAddress: CommonAddress.Ethereum.USDG,
      }).isVisible,
    ).toBe(false);
  });

  it('stays hidden when no stablecoin is involved', () => {
    expect(
      getUsdgSuggestion({
        destinationChainId: ChainId.RobinhoodChain,
        sourceTokenAddress: undefined,
        destinationTokenAddress: undefined,
      }).isVisible,
    ).toBe(false);
    expect(
      getUsdgSuggestion({
        destinationChainId: ChainId.RobinhoodChain,
        sourceTokenAddress: CommonAddress.ArbitrumOne.WETH,
        destinationTokenAddress: CommonAddress.RobinhoodChain.WETH,
      }).isVisible,
    ).toBe(false);
  });

  it('stays hidden for every other destination chain', () => {
    expect(
      getUsdgSuggestion({
        destinationChainId: ChainId.ArbitrumOne,
        sourceTokenAddress: CommonAddress.Ethereum.USDC,
        destinationTokenAddress: CommonAddress.Ethereum.USDC,
      }).isVisible,
    ).toBe(false);
  });
});

describe.sequential('useUsdgSuggestion', () => {
  const usdgLogoURI = 'https://example.com/usdg.png';
  const setQueryParams = vi.fn();

  function fakeToken(address: string, symbol: string): ERC20BridgeToken {
    return {
      address,
      symbol,
      name: symbol,
      decimals: 6,
      type: TokenType.ERC20,
      listIds: new Set<string>(),
    } as unknown as ERC20BridgeToken;
  }

  function mockHooks({
    sourceChainId,
    destinationChainId,
    selectedToken,
    destinationToken,
  }: {
    sourceChainId: ChainId;
    destinationChainId: ChainId;
    selectedToken: ERC20BridgeToken | null;
    destinationToken: ERC20BridgeToken | null;
  }) {
    vi.mocked(useNetworks).mockReturnValue([
      { sourceChain: { id: sourceChainId }, destinationChain: { id: destinationChainId } },
      vi.fn(),
    ] as unknown as ReturnType<typeof useNetworks>);
    vi.mocked(useSelectedToken).mockReturnValue([selectedToken, vi.fn()]);
    vi.mocked(useDestinationToken).mockReturnValue(destinationToken);
    vi.mocked(useArbQueryParams).mockReturnValue([{}, setQueryParams] as unknown as ReturnType<
      typeof useArbQueryParams
    >);
    // the hook looks the logo up by lowercased address, matching the token list keys
    vi.mocked(useTokensFromLists).mockReturnValue({
      data: {
        [CommonAddress.RobinhoodChain.USDG.toLowerCase()]: {
          ...fakeToken(CommonAddress.RobinhoodChain.USDG, 'USDG'),
          logoURI: usdgLogoURI,
        },
        [CommonAddress.Ethereum.USDG.toLowerCase()]: {
          ...fakeToken(CommonAddress.Ethereum.USDG, 'USDG'),
          logoURI: usdgLogoURI,
        },
      },
      isLoading: false,
    } as unknown as ReturnType<typeof useTokensFromLists>);
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('switches a USDC transfer from Arbitrum One to the Robinhood USDG contract and tracks it', () => {
    const usdc = fakeToken(CommonAddress.ArbitrumOne.USDC, 'USDC');
    mockHooks({
      sourceChainId: ChainId.ArbitrumOne,
      destinationChainId: ChainId.RobinhoodChain,
      selectedToken: usdc,
      // not a swap: the destination token resolves to the selected token
      destinationToken: usdc,
    });

    const { result } = renderHook(useUsdgSuggestion);

    expect(result.current.isVisible).toBe(true);
    expect(result.current.destinationSymbol).toBe('USDC');
    expect(result.current.usdgLogoURI).toBe(usdgLogoURI);
    expect(trackEvent).toHaveBeenCalledTimes(1);
    expect(trackEvent).toHaveBeenCalledWith('USDG Suggestion Banner', {
      action: 'shown',
      sourceChainId: ChainId.ArbitrumOne,
      destinationChainId: ChainId.RobinhoodChain,
      sourceTokenAddress: CommonAddress.ArbitrumOne.USDC,
      destinationTokenAddress: CommonAddress.ArbitrumOne.USDC,
    });

    act(() => result.current.switchToUsdg());

    expect(setQueryParams).toHaveBeenCalledWith({
      destinationToken: CommonAddress.RobinhoodChain.USDG,
    });
    expect(trackEvent).toHaveBeenLastCalledWith(
      'USDG Suggestion Banner',
      expect.objectContaining({ action: 'switched' }),
    );
  });

  it('switches to the Ethereum USDG contract when bridging from Ethereum', () => {
    const usdc = fakeToken(CommonAddress.Ethereum.USDC, 'USDC');
    mockHooks({
      sourceChainId: ChainId.Ethereum,
      destinationChainId: ChainId.RobinhoodChain,
      selectedToken: usdc,
      destinationToken: usdc,
    });

    const { result } = renderHook(useUsdgSuggestion);
    act(() => result.current.switchToUsdg());

    expect(setQueryParams).toHaveBeenCalledWith({ destinationToken: CommonAddress.Ethereum.USDG });
  });

  it('tracks `shown` once per exposure, not again when the stablecoin changes', () => {
    const usdc = fakeToken(CommonAddress.ArbitrumOne.USDC, 'USDC');
    mockHooks({
      sourceChainId: ChainId.ArbitrumOne,
      destinationChainId: ChainId.RobinhoodChain,
      selectedToken: usdc,
      destinationToken: usdc,
    });
    const { rerender } = renderHook(useUsdgSuggestion);
    expect(trackEvent).toHaveBeenCalledTimes(1);

    const usdt = fakeToken(CommonAddress.ArbitrumOne.USDT, 'USDT');
    mockHooks({
      sourceChainId: ChainId.ArbitrumOne,
      destinationChainId: ChainId.RobinhoodChain,
      selectedToken: usdt,
      destinationToken: usdt,
    });
    rerender();

    expect(trackEvent).toHaveBeenCalledTimes(1);
  });

  it('omits the destination symbol when a stablecoin source points at native ETH', () => {
    mockHooks({
      sourceChainId: ChainId.ArbitrumOne,
      destinationChainId: ChainId.RobinhoodChain,
      selectedToken: fakeToken(CommonAddress.ArbitrumOne.USDC, 'USDC'),
      destinationToken: null,
    });

    const { result } = renderHook(useUsdgSuggestion);

    expect(result.current.isVisible).toBe(true);
    expect(result.current.destinationSymbol).toBeUndefined();
  });

  it('is hidden and tracks nothing for other destination chains', () => {
    const usdc = fakeToken(CommonAddress.Ethereum.USDC, 'USDC');
    mockHooks({
      sourceChainId: ChainId.Ethereum,
      destinationChainId: ChainId.ArbitrumOne,
      selectedToken: usdc,
      destinationToken: usdc,
    });

    const { result } = renderHook(useUsdgSuggestion);

    expect(result.current.isVisible).toBe(false);
    expect(trackEvent).not.toHaveBeenCalled();
  });
});
