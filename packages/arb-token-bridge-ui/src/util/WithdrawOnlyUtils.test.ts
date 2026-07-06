import { describe, expect, it } from 'vitest';

import { isCanonicalDepositBlocked } from './WithdrawOnlyUtils';

const ENA_ARB = '0x58538e6a46e07434d7e7375bc268d3cb839c0133'; // ENA OFT on Arbitrum
const CANONICAL_ENA_ARB = '0xdf8f0c63d9335a0abd89f9f752d293a98ea977d8'; // standard-gateway address
const USDC_E_ARB = '0xff970a61a04b1ca14834a43f5de4533ebddb5cc8';
const FRAX_ARB = '0x17fc002b466eec40dae837fc4be5c67993ddbd6f'; // plain ERC20 rep, not an OFT
const CANONICAL_FRAX_ARB = '0x7468a5d8e02245b00e8c0217fce021c70bc51305'; // standard-gateway address
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

describe('isCanonicalDepositBlocked', () => {
  it('blocks when canonical bridging lands elsewhere than the OFT deployment (ENA)', () => {
    expect(
      isCanonicalDepositBlocked({
        childTokenAddresses: [ENA_ARB],
        hasOftChildDeployment: true,
        canonicalChildTokenAddress: CANONICAL_ENA_ARB,
      }),
    ).toBe(true);
  });

  it('allows when canonical bridging lands on a recognized representation (USDC.e)', () => {
    expect(
      isCanonicalDepositBlocked({
        childTokenAddresses: [USDC_E_ARB],
        hasOftChildDeployment: false,
        canonicalChildTokenAddress: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8', // checksummed
      }),
    ).toBe(false);
  });

  it('allows a recognized representation even when an OFT deployment also exists', () => {
    expect(
      isCanonicalDepositBlocked({
        childTokenAddresses: [ENA_ARB, USDC_E_ARB],
        hasOftChildDeployment: true,
        canonicalChildTokenAddress: USDC_E_ARB,
      }),
    ).toBe(false);
  });

  it('blocks when there is no canonical route (zero address, e.g. USDT)', () => {
    expect(
      isCanonicalDepositBlocked({
        childTokenAddresses: [ENA_ARB],
        hasOftChildDeployment: true,
        canonicalChildTokenAddress: ZERO_ADDRESS,
      }),
    ).toBe(true);
  });

  it('blocks when the canonical address could not be resolved', () => {
    expect(
      isCanonicalDepositBlocked({
        childTokenAddresses: [ENA_ARB],
        hasOftChildDeployment: true,
        canonicalChildTokenAddress: null,
      }),
    ).toBe(true);
  });

  it('allows a plain ERC20 with no OFT deployment even when canonical lands elsewhere (FRAX)', () => {
    // FRAX is merely tracked by LayerZero as an ERC20; there is no OFT route to
    // force it onto, so a canonical deposit must stay allowed.
    expect(
      isCanonicalDepositBlocked({
        childTokenAddresses: [FRAX_ARB],
        hasOftChildDeployment: false,
        canonicalChildTokenAddress: CANONICAL_FRAX_ARB,
      }),
    ).toBe(false);
  });

  it('allows when the token has no representation on the destination', () => {
    expect(
      isCanonicalDepositBlocked({
        childTokenAddresses: [],
        hasOftChildDeployment: false,
        canonicalChildTokenAddress: CANONICAL_ENA_ARB,
      }),
    ).toBe(false);
  });
});
