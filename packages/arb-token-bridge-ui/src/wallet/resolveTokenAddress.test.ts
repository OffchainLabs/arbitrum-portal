import { constants } from 'ethers';
import { describe, expect, it } from 'vitest';

import { ChainId } from '../types/ChainId';
import { CommonAddress } from '../util/CommonAddressUtils';
import { SOLANA_NATIVE_TOKEN_ADDRESS } from './ecosystems/solana';
import { resolveTokenAddress } from './resolveTokenAddress';

const token = (address: string, l2Address?: string) => ({ address, l2Address });
const ELYSIUM_USDCE = '0xb47c4c8f73f009cc0c0d3f92b388d13e293f0b65';

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

  it('reads the Elysium address of a token paired with Arbitrum One', () => {
    const pairedToken = token(CommonAddress.ArbitrumOne['USDC.e'], ELYSIUM_USDCE);
    expect(
      resolveTokenAddress({
        token: pairedToken,
        side: 'destination',
        sourceChainId: ChainId.ArbitrumOne,
        destinationChainId: ChainId.Elysium,
      }),
    ).toBe(ELYSIUM_USDCE);
  });

  it('uses the token address when Elysium is the source chain', () => {
    const pairedToken = token(ELYSIUM_USDCE, CommonAddress.ArbitrumOne['USDC.e']);
    expect(
      resolveTokenAddress({
        token: pairedToken,
        side: 'source',
        sourceChainId: ChainId.Elysium,
        destinationChainId: ChainId.ArbitrumOne,
      }),
    ).toBe(ELYSIUM_USDCE);
    expect(
      resolveTokenAddress({
        token: null,
        side: 'source',
        sourceChainId: ChainId.Elysium,
        destinationChainId: ChainId.ApeChain,
        childNativeCurrencyAddress: CommonAddress.ArbitrumOne.APE,
      }),
    ).toBe(constants.AddressZero);
  });

  it('reads native APE on ApeChain when sending it to Elysium', () => {
    // The source token picker passes ApeChain's own currency, APE on Arbitrum One, as the custom one
    expect(
      resolveTokenAddress({
        token: null,
        side: 'source',
        sourceChainId: ChainId.ApeChain,
        destinationChainId: ChainId.Elysium,
        childNativeCurrencyAddress: CommonAddress.ArbitrumOne.APE,
      }),
    ).toBe(constants.AddressZero);
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
