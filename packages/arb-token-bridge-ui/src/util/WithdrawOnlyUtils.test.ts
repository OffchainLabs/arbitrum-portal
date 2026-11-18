import { describe, expect, it } from 'vitest';

import { ChainId } from '../types/ChainId';
import { CommonAddress } from './CommonAddressUtils';
import { isCanonicalDepositBlocked, isWithdrawOnlyToken } from './WithdrawOnlyUtils';

const CANONICAL_ENA_ARB = '0xdf8f0c63d9335a0abd89f9f752d293a98ea977d8'; // standard-gateway address
const USDC_E_ARB = '0xff970a61a04b1ca14834a43f5de4533ebddb5cc8';
const CANONICAL_FRAX_ARB = '0x7468a5d8e02245b00e8c0217fce021c70bc51305'; // standard-gateway address
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

describe('isCanonicalDepositBlocked', () => {
  it('blocks when canonical bridging lands on a token LayerZero does not recognize (ENA)', () => {
    expect(
      isCanonicalDepositBlocked({
        canonicalChildTokenAddress: CANONICAL_ENA_ARB,
        canonicalIsKnownLayerZeroToken: false,
        hasOftChildDeployment: true,
      }),
    ).toBe(true);
  });

  it('allows when canonical bridging lands on a recognized token (USDC.e)', () => {
    expect(
      isCanonicalDepositBlocked({
        canonicalChildTokenAddress: USDC_E_ARB,
        canonicalIsKnownLayerZeroToken: true,
        hasOftChildDeployment: false,
      }),
    ).toBe(false);
  });

  it('allows a recognized canonical token even when an OFT deployment also exists (ARB)', () => {
    // ARB's canonical L2 token is a real, listed token; a separate OFT ARB exists,
    // but the canonical route lands on the correct token, so it must stay allowed.
    expect(
      isCanonicalDepositBlocked({
        canonicalChildTokenAddress: '0x912CE59144191C1204E64559FE8253a0e49E6548',
        canonicalIsKnownLayerZeroToken: true,
        hasOftChildDeployment: true,
      }),
    ).toBe(false);
  });

  it('blocks when there is no canonical route (zero address, e.g. USDT)', () => {
    expect(
      isCanonicalDepositBlocked({
        canonicalChildTokenAddress: ZERO_ADDRESS,
        canonicalIsKnownLayerZeroToken: false,
        hasOftChildDeployment: true,
      }),
    ).toBe(true);
  });

  it('blocks when the canonical address could not be resolved', () => {
    expect(
      isCanonicalDepositBlocked({
        canonicalChildTokenAddress: null,
        canonicalIsKnownLayerZeroToken: false,
        hasOftChildDeployment: true,
      }),
    ).toBe(true);
  });

  it('allows a plain ERC20 with no OFT deployment even when canonical is unrecognized (FRAX)', () => {
    // FRAX is merely tracked by LayerZero as an ERC20; there is no OFT route to
    // force it onto, so a canonical deposit must stay allowed.
    expect(
      isCanonicalDepositBlocked({
        canonicalChildTokenAddress: CANONICAL_FRAX_ARB,
        canonicalIsKnownLayerZeroToken: false,
        hasOftChildDeployment: false,
      }),
    ).toBe(false);
  });
});

describe('isWithdrawOnlyToken', () => {
  it('disables USDC deposits to Robinhood Chain', () => {
    expect(
      isWithdrawOnlyToken({
        parentChainErc20Address: CommonAddress.Ethereum.USDC,
        childChainId: ChainId.RobinhoodChain,
      }),
    ).toBe(true);
  });

  it('disables USDT deposits to Robinhood Chain', () => {
    expect(
      isWithdrawOnlyToken({
        parentChainErc20Address: CommonAddress.Ethereum.USDT,
        childChainId: ChainId.RobinhoodChain,
      }),
    ).toBe(true);
  });

  it('keeps USDC deposits enabled for Arbitrum One', () => {
    expect(
      isWithdrawOnlyToken({
        parentChainErc20Address: CommonAddress.Ethereum.USDC,
        childChainId: ChainId.ArbitrumOne,
      }),
    ).toBe(false);
  });
});
