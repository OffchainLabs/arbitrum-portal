import { describe, expect, it } from 'vitest';

import { isCanonicalDepositBlocked } from './WithdrawOnlyUtils';

const ENA_ARB = '0x58538e6a46e07434d7e7375bc268d3cb839c0133'; // ENA OFT on Arbitrum
const CANONICAL_ENA_ARB = '0xdf8f0c63d9335a0abd89f9f752d293a98ea977d8'; // standard-gateway address
const USDC_E_ARB = '0xff970a61a04b1ca14834a43f5de4533ebddb5cc8';
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

describe('isCanonicalDepositBlocked', () => {
  it('blocks when canonical bridging lands on a different token than the OFT (ENA)', () => {
    expect(
      isCanonicalDepositBlocked({
        childTokenAddresses: [ENA_ARB],
        canonicalChildTokenAddress: CANONICAL_ENA_ARB,
      }),
    ).toBe(true);
  });

  it('allows when canonical bridging lands on the OFT token itself (USDC.e)', () => {
    expect(
      isCanonicalDepositBlocked({
        childTokenAddresses: [USDC_E_ARB],
        // returned checksummed to prove the comparison is case-insensitive
        canonicalChildTokenAddress: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8',
      }),
    ).toBe(false);
  });

  it('blocks when there is no canonical route (zero address, e.g. USDT)', () => {
    expect(
      isCanonicalDepositBlocked({
        childTokenAddresses: [ENA_ARB],
        canonicalChildTokenAddress: ZERO_ADDRESS,
      }),
    ).toBe(true);
  });

  it('blocks when the canonical address could not be resolved', () => {
    expect(
      isCanonicalDepositBlocked({
        childTokenAddresses: [ENA_ARB],
        canonicalChildTokenAddress: null,
      }),
    ).toBe(true);
  });

  it('allows when the token has no OFT deployment on the destination', () => {
    expect(
      isCanonicalDepositBlocked({
        childTokenAddresses: [],
        canonicalChildTokenAddress: CANONICAL_ENA_ARB,
      }),
    ).toBe(false);
  });

  it('matches against any of the destination deployments', () => {
    expect(
      isCanonicalDepositBlocked({
        childTokenAddresses: [ENA_ARB, USDC_E_ARB],
        canonicalChildTokenAddress: USDC_E_ARB,
      }),
    ).toBe(false);
  });
});
