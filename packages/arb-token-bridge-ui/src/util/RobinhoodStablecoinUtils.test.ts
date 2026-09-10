import { constants } from 'ethers';
import { describe, expect, it } from 'vitest';

import { ChainId } from '../types/ChainId';
import { CommonAddress } from './CommonAddressUtils';
import {
  getUsdgDestinationTokenAddress,
  isStablecoin,
  isTokenUSDG,
  isUsdgQueryParamAlias,
} from './RobinhoodStablecoinUtils';

describe('isTokenUSDG', () => {
  it('matches both the Ethereum and the Robinhood USDG contracts, case-insensitively', () => {
    expect(isTokenUSDG(CommonAddress.Ethereum.USDG)).toBe(true);
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
  it('uses the Ethereum contract when bridging from Ethereum', () => {
    expect(getUsdgDestinationTokenAddress(ChainId.Ethereum)).toBe(CommonAddress.Ethereum.USDG);
  });

  it('uses the Robinhood contract for every other source chain', () => {
    expect(getUsdgDestinationTokenAddress(ChainId.ArbitrumOne)).toBe(
      CommonAddress.RobinhoodChain.USDG,
    );
    expect(getUsdgDestinationTokenAddress(ChainId.Base)).toBe(CommonAddress.RobinhoodChain.USDG);
    expect(getUsdgDestinationTokenAddress(ChainId.ApeChain)).toBe(
      CommonAddress.RobinhoodChain.USDG,
    );
  });
});
