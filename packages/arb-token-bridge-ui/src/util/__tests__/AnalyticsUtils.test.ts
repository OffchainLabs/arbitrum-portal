import { constants } from 'ethers';
import { describe, expect, it } from 'vitest';

import { ChainId } from '../../types/ChainId';
import { getLifiAssetType } from '../AnalyticsUtils';
import { CommonAddress } from '../CommonAddressUtils';

describe('getLifiAssetType', () => {
  it('classifies non-zero-address LiFi tokens as ERC20', () => {
    expect(
      getLifiAssetType({
        tokenAddress: CommonAddress.Ethereum.USDC,
        chainId: ChainId.Ethereum,
      }),
    ).toBe('ERC20');
  });

  it('classifies zero-address ETH transfers routes as ETH', () => {
    expect(
      getLifiAssetType({
        tokenAddress: constants.AddressZero,
        chainId: ChainId.Ethereum,
      }),
    ).toBe('ETH');
  });

  it('classifies zero-address ApeChain transfers as ERC20', () => {
    expect(
      getLifiAssetType({
        tokenAddress: constants.AddressZero,
        chainId: ChainId.ApeChain,
      }),
    ).toBe('ERC20');
  });

  it('classifies ApeChain custom native token addresses as ERC20', () => {
    expect(
      getLifiAssetType({
        tokenAddress: CommonAddress.ArbitrumOne.APE,
        chainId: ChainId.ApeChain,
      }),
    ).toBe('ERC20');
  });
});
