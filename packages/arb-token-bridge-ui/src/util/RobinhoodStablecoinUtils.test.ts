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
    CommonAddress.Ethereum.USDC,
    CommonAddress.Ethereum.USDT,
    CommonAddress.Ethereum.DAI,
    CommonAddress.ArbitrumOne.USDC,
    CommonAddress.ArbitrumOne['USDC.e'],
    CommonAddress.ArbitrumOne.AUSD,
    CommonAddress.Base.USDS,
    CommonAddress.ApeChain.USDT,
    CommonAddress.RobinhoodChain.USDe,
  ])('recognises %s', (address) => {
    expect(isStablecoin(address)).toBe(true);
  });

  it('does not treat USDG, yield wrappers, ETH or WETH as a stablecoin', () => {
    expect(isStablecoin(CommonAddress.Ethereum.USDG)).toBe(false);
    expect(isStablecoin(CommonAddress.RobinhoodChain.USDG)).toBe(false);
    expect(isStablecoin(CommonAddress.RobinhoodChain.sUSDe)).toBe(false);
    expect(isStablecoin(CommonAddress.Ethereum.sUSDe)).toBe(false);
    expect(isStablecoin(CommonAddress.RobinhoodChain.spUSDG)).toBe(false);
    expect(isStablecoin(constants.AddressZero)).toBe(false);
    expect(isStablecoin(CommonAddress.ArbitrumOne.WETH)).toBe(false);
    expect(isStablecoin(undefined)).toBe(false);
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
