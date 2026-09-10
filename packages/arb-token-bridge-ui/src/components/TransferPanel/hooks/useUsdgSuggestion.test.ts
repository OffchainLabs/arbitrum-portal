import { act, renderHook } from '@testing-library/react';
import { constants } from 'ethers';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ERC20BridgeToken, TokenType } from '../../../hooks/arbTokenBridge.types';
import { useArbQueryParams } from '../../../hooks/useArbQueryParams';
import { useDestinationToken } from '../../../hooks/useDestinationToken';
import { useNetworks } from '../../../hooks/useNetworks';
import { useNetworksRelationship } from '../../../hooks/useNetworksRelationship';
import { useSelectedToken } from '../../../hooks/useSelectedToken';
import { ChainId } from '../../../types/ChainId';
import { trackEvent } from '../../../util/AnalyticsUtils';
import { CommonAddress } from '../../../util/CommonAddressUtils';
import { useTokensFromLists } from '../TokenSearchUtils';
import { isUsdgSuggested, useUsdgSuggestion } from './useUsdgSuggestion';

vi.mock('../../../hooks/useArbQueryParams', () => ({ useArbQueryParams: vi.fn() }));
vi.mock('../../../hooks/useDestinationToken', () => ({ useDestinationToken: vi.fn() }));
vi.mock('../../../hooks/useNetworks', () => ({ useNetworks: vi.fn() }));
vi.mock('../../../hooks/useNetworksRelationship', () => ({ useNetworksRelationship: vi.fn() }));
vi.mock('../../../hooks/useSelectedToken', () => ({ useSelectedToken: vi.fn() }));
vi.mock('../../../util/AnalyticsUtils', () => ({ trackEvent: vi.fn() }));
vi.mock('../TokenSearchUtils', () => ({ useTokensFromLists: vi.fn() }));

describe('isUsdgSuggested', () => {
  it('shows when a non-USDG stablecoin is the destination on Robinhood Chain', () => {
    expect(
      isUsdgSuggested({
        destinationChainId: ChainId.RobinhoodChain,
        destinationTokenAddress: CommonAddress.ArbitrumOne.USDT,
        destinationTokenAddressChainId: ChainId.ArbitrumOne,
      }),
    ).toBe(true);
  });

  it('stays hidden for a USDe destination on Robinhood Chain', () => {
    expect(
      isUsdgSuggested({
        destinationChainId: ChainId.RobinhoodChain,
        destinationTokenAddress: CommonAddress.ArbitrumOne.USDe,
        destinationTokenAddressChainId: ChainId.ArbitrumOne,
      }),
    ).toBe(false);
    expect(
      isUsdgSuggested({
        destinationChainId: ChainId.RobinhoodChain,
        destinationTokenAddress: CommonAddress.RobinhoodChain.USDe,
        destinationTokenAddressChainId: ChainId.RobinhoodChain,
      }),
    ).toBe(false);
  });

  it('stays hidden when the destination is native ETH, whether missing or the zero address', () => {
    expect(
      isUsdgSuggested({
        destinationChainId: ChainId.RobinhoodChain,
        destinationTokenAddress: undefined,
        destinationTokenAddressChainId: ChainId.ArbitrumOne,
      }),
    ).toBe(false);
    expect(
      isUsdgSuggested({
        destinationChainId: ChainId.RobinhoodChain,
        destinationTokenAddress: constants.AddressZero,
        destinationTokenAddressChainId: ChainId.ArbitrumOne,
      }),
    ).toBe(false);
  });

  it('stays hidden when the destination is any other non-stablecoin', () => {
    expect(
      isUsdgSuggested({
        destinationChainId: ChainId.RobinhoodChain,
        destinationTokenAddress: CommonAddress.RobinhoodChain.APE,
        destinationTokenAddressChainId: ChainId.RobinhoodChain,
      }),
    ).toBe(false);
    expect(
      isUsdgSuggested({
        destinationChainId: ChainId.RobinhoodChain,
        destinationTokenAddress: CommonAddress.RobinhoodChain.WETH,
        destinationTokenAddressChainId: ChainId.RobinhoodChain,
      }),
    ).toBe(false);
  });

  it('stays hidden once USDG is the destination', () => {
    expect(
      isUsdgSuggested({
        destinationChainId: ChainId.RobinhoodChain,
        destinationTokenAddress: CommonAddress.RobinhoodChain.USDG,
        destinationTokenAddressChainId: ChainId.RobinhoodChain,
      }),
    ).toBe(false);
    expect(
      isUsdgSuggested({
        destinationChainId: ChainId.RobinhoodChain,
        destinationTokenAddress: CommonAddress.Ethereum.USDG,
        destinationTokenAddressChainId: ChainId.Ethereum,
      }),
    ).toBe(false);
  });

  it('stays hidden when the address is a stablecoin on some other chain', () => {
    expect(
      isUsdgSuggested({
        destinationChainId: ChainId.RobinhoodChain,
        destinationTokenAddress: CommonAddress.ArbitrumOne.USDT,
        destinationTokenAddressChainId: ChainId.Ethereum,
      }),
    ).toBe(false);
  });

  it('stays hidden for every other destination chain', () => {
    expect(
      isUsdgSuggested({
        destinationChainId: ChainId.ArbitrumOne,
        destinationTokenAddress: CommonAddress.Ethereum.USDC,
        destinationTokenAddressChainId: ChainId.Ethereum,
      }),
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
    // every transfer into Robinhood Chain is a deposit, so the source chain is the parent
    vi.mocked(useNetworksRelationship).mockReturnValue({
      parentChain: { id: sourceChainId },
    } as unknown as ReturnType<typeof useNetworksRelationship>);
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

  it('is hidden and tracks nothing when a stablecoin source points at native ETH', () => {
    mockHooks({
      sourceChainId: ChainId.ArbitrumOne,
      destinationChainId: ChainId.RobinhoodChain,
      selectedToken: fakeToken(CommonAddress.ArbitrumOne.USDC, 'USDC'),
      destinationToken: null,
    });

    const { result } = renderHook(useUsdgSuggestion);

    expect(result.current.isVisible).toBe(false);
    expect(result.current.destinationSymbol).toBeUndefined();
    expect(trackEvent).not.toHaveBeenCalled();
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

  it('hides after dismiss, tracks it, and stays hidden for the same selection', () => {
    const usdc = fakeToken(CommonAddress.ArbitrumOne.USDC, 'USDC');
    mockHooks({
      sourceChainId: ChainId.ArbitrumOne,
      destinationChainId: ChainId.RobinhoodChain,
      selectedToken: usdc,
      destinationToken: usdc,
    });
    const { result, rerender } = renderHook(useUsdgSuggestion);
    expect(result.current.isVisible).toBe(true);

    act(() => result.current.dismiss());

    expect(result.current.isVisible).toBe(false);
    expect(trackEvent).toHaveBeenLastCalledWith('USDG Suggestion Banner', {
      action: 'dismissed',
      sourceChainId: ChainId.ArbitrumOne,
      destinationChainId: ChainId.RobinhoodChain,
      sourceTokenAddress: CommonAddress.ArbitrumOne.USDC,
      destinationTokenAddress: CommonAddress.ArbitrumOne.USDC,
    });

    rerender();
    expect(result.current.isVisible).toBe(false);
  });

  it('reappears after dismiss once the selection changes and tracks a new exposure', () => {
    const usdc = fakeToken(CommonAddress.ArbitrumOne.USDC, 'USDC');
    mockHooks({
      sourceChainId: ChainId.ArbitrumOne,
      destinationChainId: ChainId.RobinhoodChain,
      selectedToken: usdc,
      destinationToken: usdc,
    });
    const { result, rerender } = renderHook(useUsdgSuggestion);
    act(() => result.current.dismiss());
    expect(result.current.isVisible).toBe(false);
    expect(trackEvent).toHaveBeenCalledTimes(2);

    const usdt = fakeToken(CommonAddress.ArbitrumOne.USDT, 'USDT');
    mockHooks({
      sourceChainId: ChainId.ArbitrumOne,
      destinationChainId: ChainId.RobinhoodChain,
      selectedToken: usdt,
      destinationToken: usdt,
    });
    rerender();

    expect(result.current.isVisible).toBe(true);
    expect(trackEvent).toHaveBeenCalledTimes(3);
    expect(trackEvent).toHaveBeenLastCalledWith(
      'USDG Suggestion Banner',
      expect.objectContaining({
        action: 'shown',
        sourceTokenAddress: CommonAddress.ArbitrumOne.USDT,
      }),
    );

    // and picking the originally dismissed stablecoin again brings it back too
    mockHooks({
      sourceChainId: ChainId.ArbitrumOne,
      destinationChainId: ChainId.RobinhoodChain,
      selectedToken: usdc,
      destinationToken: usdc,
    });
    rerender();
    expect(result.current.isVisible).toBe(true);
  });

  it('treats a missing source and the zero address as the same selection when dismissed', () => {
    const usdt = fakeToken(CommonAddress.ArbitrumOne.USDT, 'USDT');
    mockHooks({
      sourceChainId: ChainId.ArbitrumOne,
      destinationChainId: ChainId.RobinhoodChain,
      selectedToken: null,
      destinationToken: usdt,
    });
    const { result, rerender } = renderHook(useUsdgSuggestion);
    expect(result.current.isVisible).toBe(true);
    act(() => result.current.dismiss());

    mockHooks({
      sourceChainId: ChainId.ArbitrumOne,
      destinationChainId: ChainId.RobinhoodChain,
      selectedToken: fakeToken(constants.AddressZero, 'ETH'),
      destinationToken: usdt,
    });
    rerender();

    expect(result.current.isVisible).toBe(false);
  });
});
