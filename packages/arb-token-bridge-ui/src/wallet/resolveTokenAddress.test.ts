import { constants } from 'ethers';
import { describe, expect, it } from 'vitest';

import { ChainId } from '../types/ChainId';
import { CommonAddress } from '../util/CommonAddressUtils';
import { SOLANA_NATIVE_TOKEN_ADDRESS } from './constants';
import { resolveTokenAddress } from './resolveTokenAddress';

const token = (address: string, l2Address?: string) => ({ address, l2Address });

describe('resolveTokenAddress', () => {
  it('resolves the transfer asset independently from the source gas asset', () => {
    expect(
      resolveTokenAddress({
        token: null,
        side: 'source',
        sourceChainId: ChainId.RobinhoodChain,
        destinationChainId: ChainId.ApeChain,
        childNativeCurrencyAddress: CommonAddress.RobinhoodChain.APE,
      }),
    ).toBe(CommonAddress.RobinhoodChain.APE);
  });

  it('uses the native sentinel for the chain gas asset', () => {
    expect(
      resolveTokenAddress({
        token: token(constants.AddressZero),
        side: 'source',
        sourceChainId: ChainId.Ethereum,
        destinationChainId: ChainId.ArbitrumOne,
      }),
    ).toBe(constants.AddressZero);
  });

  it('maps Arbitrum native USDC to Ethereum USDC on the parent chain', () => {
    expect(
      resolveTokenAddress({
        token: token(CommonAddress.ArbitrumOne.USDC, CommonAddress.ArbitrumOne.USDC),
        side: 'source',
        sourceChainId: ChainId.Ethereum,
        destinationChainId: ChainId.ArbitrumOne,
      }),
    ).toBe(CommonAddress.Ethereum.USDC);
  });

  it('keeps Arbitrum native USDC on Arbitrum One', () => {
    expect(
      resolveTokenAddress({
        token: token(CommonAddress.ArbitrumOne.USDC, CommonAddress.ArbitrumOne.USDC),
        side: 'destination',
        sourceChainId: ChainId.Ethereum,
        destinationChainId: ChainId.ArbitrumOne,
      }),
    ).toBe(CommonAddress.ArbitrumOne.USDC);
  });

  it('uses Solana token identities without EVM mapping', () => {
    expect(
      resolveTokenAddress({
        token: null,
        side: 'source',
        sourceChainId: ChainId.Solana,
        destinationChainId: ChainId.ArbitrumOne,
      }),
    ).toBe(SOLANA_NATIVE_TOKEN_ADDRESS);
  });
});
