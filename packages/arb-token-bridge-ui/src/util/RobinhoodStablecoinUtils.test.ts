import { constants } from 'ethers';
import { describe, expect, it } from 'vitest';

import { ChainId } from '../types/ChainId';
import { CommonAddress } from './CommonAddressUtils';
import {
  getUsdgDestinationTokenAddress,
  isStablecoin,
  isTokenUSDG,
  isUsdgNativeStablecoinChain,
  isUsdgQueryParamAlias,
  isUsdgSurfacedLikeEth,
} from './RobinhoodStablecoinUtils';
import { isTransferDisabledToken } from './TokenTransferDisabledUtils';

describe('USDG canonical transfers', () => {
  it('disables the canonical Ethereum route on Arbitrum One', () => {
    expect(isTransferDisabledToken(CommonAddress.Ethereum.USDG, ChainId.ArbitrumOne)).toBe(true);
  });
});

describe('isTokenUSDG', () => {
  it('matches the Ethereum, Arbitrum One and Robinhood USDG contracts, case-insensitively', () => {
    expect(isTokenUSDG(CommonAddress.Ethereum.USDG)).toBe(true);
    expect(isTokenUSDG(CommonAddress.ArbitrumOne.USDG)).toBe(true);
    expect(isTokenUSDG(CommonAddress.RobinhoodChain.USDG.toUpperCase())).toBe(true);
  });

  it('rejects USDG yield wrappers and unrelated tokens', () => {
    expect(isTokenUSDG(CommonAddress.RobinhoodChain.spUSDG)).toBe(false);
    expect(isTokenUSDG(CommonAddress.RobinhoodChain.SyrupUSDG)).toBe(false);
    expect(isTokenUSDG(CommonAddress.Ethereum.USDC)).toBe(false);
    expect(isTokenUSDG(undefined)).toBe(false);
  });
});

describe('isStablecoin', () => {
  it.each([
    [CommonAddress.Ethereum.USDC, ChainId.Ethereum],
    [CommonAddress.Ethereum.USDT, ChainId.Ethereum],
    [CommonAddress.Ethereum.DAI, ChainId.Ethereum],
    [CommonAddress.ArbitrumOne.USDC, ChainId.ArbitrumOne],
    [CommonAddress.ArbitrumOne['USDC.e'], ChainId.ArbitrumOne],
    [CommonAddress.ArbitrumOne.AUSD, ChainId.ArbitrumOne],
    [CommonAddress.Base.USDS, ChainId.Base],
    [CommonAddress.ApeChain.USDT, ChainId.ApeChain],
  ])('recognises %s on chain %i', (address, chainId) => {
    expect(isStablecoin(address, chainId)).toBe(true);
    expect(isStablecoin(address.toUpperCase(), chainId)).toBe(true);
  });

  it('only matches an address on the chain it lives on', () => {
    expect(isStablecoin(CommonAddress.ArbitrumOne.USDC, ChainId.Ethereum)).toBe(false);
    expect(isStablecoin(CommonAddress.Ethereum.USDC, ChainId.ArbitrumOne)).toBe(false);
    expect(isStablecoin(CommonAddress.Base.USDC, ChainId.RobinhoodChain)).toBe(false);
  });

  it('does not treat USDG, USDe, yield wrappers, ETH or WETH as a stablecoin', () => {
    expect(isStablecoin(CommonAddress.Ethereum.USDG, ChainId.Ethereum)).toBe(false);
    expect(isStablecoin(CommonAddress.RobinhoodChain.USDG, ChainId.RobinhoodChain)).toBe(false);
    expect(isStablecoin(CommonAddress.Ethereum.USDe, ChainId.Ethereum)).toBe(false);
    expect(isStablecoin(CommonAddress.ArbitrumOne.USDe, ChainId.ArbitrumOne)).toBe(false);
    expect(isStablecoin(CommonAddress.Base.USDe, ChainId.Base)).toBe(false);
    expect(isStablecoin(CommonAddress.RobinhoodChain.USDe, ChainId.RobinhoodChain)).toBe(false);
    expect(isStablecoin(CommonAddress.RobinhoodChain.sUSDe, ChainId.RobinhoodChain)).toBe(false);
    expect(isStablecoin(CommonAddress.Ethereum.sUSDe, ChainId.Ethereum)).toBe(false);
    expect(isStablecoin(CommonAddress.RobinhoodChain.spUSDG, ChainId.RobinhoodChain)).toBe(false);
    expect(isStablecoin(constants.AddressZero, ChainId.Ethereum)).toBe(false);
    expect(isStablecoin(CommonAddress.ArbitrumOne.WETH, ChainId.ArbitrumOne)).toBe(false);
    expect(isStablecoin(undefined, ChainId.Ethereum)).toBe(false);
  });
});

describe('isUsdgNativeStablecoinChain', () => {
  it('is true only where USDG is the official stablecoin', () => {
    expect(isUsdgNativeStablecoinChain(ChainId.RobinhoodChain)).toBe(true);
    expect(isUsdgNativeStablecoinChain(ChainId.ArbitrumOne)).toBe(true);
    expect(isUsdgNativeStablecoinChain(ChainId.Ethereum)).toBe(false);
    expect(isUsdgNativeStablecoinChain(ChainId.Base)).toBe(false);
    expect(isUsdgNativeStablecoinChain(ChainId.ArbitrumNova)).toBe(false);
  });
});

describe('isUsdgSurfacedLikeEth', () => {
  it('is true on every route into Robinhood Chain', () => {
    expect(
      isUsdgSurfacedLikeEth({
        sourceChainId: ChainId.Ethereum,
        destinationChainId: ChainId.RobinhoodChain,
      }),
    ).toBe(true);
    expect(
      isUsdgSurfacedLikeEth({
        sourceChainId: ChainId.Base,
        destinationChainId: ChainId.RobinhoodChain,
      }),
    ).toBe(true);
  });

  it('is true on every route with Arbitrum One as source or destination', () => {
    expect(
      isUsdgSurfacedLikeEth({
        sourceChainId: ChainId.Ethereum,
        destinationChainId: ChainId.ArbitrumOne,
      }),
    ).toBe(true);
    expect(
      isUsdgSurfacedLikeEth({
        sourceChainId: ChainId.ArbitrumOne,
        destinationChainId: ChainId.RobinhoodChain,
      }),
    ).toBe(true);
    expect(
      isUsdgSurfacedLikeEth({
        sourceChainId: ChainId.RobinhoodChain,
        destinationChainId: ChainId.ArbitrumOne,
      }),
    ).toBe(true);
  });

  it('leaves every other route alone, including withdrawals out of Robinhood Chain', () => {
    expect(
      isUsdgSurfacedLikeEth({
        sourceChainId: ChainId.RobinhoodChain,
        destinationChainId: ChainId.Ethereum,
      }),
    ).toBe(false);
    expect(
      isUsdgSurfacedLikeEth({
        sourceChainId: ChainId.Base,
        destinationChainId: ChainId.ApeChain,
      }),
    ).toBe(false);
  });
});

describe('isUsdgQueryParamAlias', () => {
  it('accepts the usdg literal in any casing and nothing else', () => {
    expect(isUsdgQueryParamAlias('usdg')).toBe(true);
    expect(isUsdgQueryParamAlias('USDG')).toBe(true);
    expect(isUsdgQueryParamAlias(CommonAddress.Ethereum.USDG)).toBe(false);
    expect(isUsdgQueryParamAlias(null)).toBe(false);
    expect(isUsdgQueryParamAlias(undefined)).toBe(false);
  });
});

describe('getUsdgDestinationTokenAddress', () => {
  const into = (sourceChainId: ChainId, destinationChainId: ChainId) =>
    getUsdgDestinationTokenAddress({ sourceChainId, destinationChainId });

  it('into Robinhood Chain: the Ethereum or Arbitrum One contract from those chains', () => {
    expect(into(ChainId.Ethereum, ChainId.RobinhoodChain)).toBe(CommonAddress.Ethereum.USDG);
    expect(into(ChainId.ArbitrumOne, ChainId.RobinhoodChain)).toBe(CommonAddress.ArbitrumOne.USDG);
  });

  it('into Robinhood Chain: the Robinhood contract from every other chain', () => {
    expect(into(ChainId.Base, ChainId.RobinhoodChain)).toBe(CommonAddress.RobinhoodChain.USDG);
    expect(into(ChainId.ApeChain, ChainId.RobinhoodChain)).toBe(CommonAddress.RobinhoodChain.USDG);
  });

  it('into Arbitrum One: the parent-chain contract of the pair', () => {
    expect(into(ChainId.Ethereum, ChainId.ArbitrumOne)).toBe(CommonAddress.Ethereum.USDG);
    // Arbitrum One is the parent when withdrawing from Robinhood Chain
    expect(into(ChainId.RobinhoodChain, ChainId.ArbitrumOne)).toBe(CommonAddress.ArbitrumOne.USDG);
  });

  it('is undefined on routes without a USDG pair', () => {
    expect(into(ChainId.Base, ChainId.ArbitrumOne)).toBeUndefined();
    expect(into(ChainId.ApeChain, ChainId.ArbitrumOne)).toBeUndefined();
    expect(into(ChainId.ArbitrumNova, ChainId.ArbitrumOne)).toBeUndefined();
    expect(into(ChainId.ArbitrumOne, ChainId.Ethereum)).toBeUndefined();
    expect(into(ChainId.RobinhoodChain, ChainId.Ethereum)).toBeUndefined();
    expect(into(ChainId.Ethereum, ChainId.ApeChain)).toBeUndefined();
  });
});
