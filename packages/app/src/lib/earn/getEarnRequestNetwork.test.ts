import { describe, expect, it } from 'vitest';

import { getEarnRequestNetwork } from './getEarnRequestNetwork';

describe('getEarnRequestNetwork', () => {
  it('returns mainnet for ethereum network names', () => {
    expect(getEarnRequestNetwork('mainnet')).toBe('mainnet');
    expect(getEarnRequestNetwork('ethereum')).toBe('mainnet');
    expect(getEarnRequestNetwork('Ethereum Mainnet')).toBe('mainnet');
  });

  it('returns arbitrum for arbitrum network names', () => {
    expect(getEarnRequestNetwork('arbitrum')).toBe('arbitrum');
    expect(getEarnRequestNetwork('Arbitrum One')).toBe('arbitrum');
    expect(getEarnRequestNetwork('arb')).toBe('arbitrum');
  });

  it('defaults to arbitrum for empty or unknown values', () => {
    expect(getEarnRequestNetwork('')).toBe('arbitrum');
    expect(getEarnRequestNetwork(undefined)).toBe('arbitrum');
    expect(getEarnRequestNetwork('unknown-network')).toBe('arbitrum');
  });
});
