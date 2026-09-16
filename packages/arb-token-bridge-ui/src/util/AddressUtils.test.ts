import { describe, expect, it } from 'vitest';

import { addressesEqual, isValidAddress, normalizeAddress } from './AddressUtils';

describe('normalizeAddress', () => {
  it('normalizes an EVM-shaped address', () => {
    const address = '0x9481eF9e2CA814fc94676dEa3E8c3097B06b3a33';

    expect(normalizeAddress(address)).toBe('0x9481ef9e2ca814fc94676dea3e8c3097b06b3a33');
    expect(isValidAddress(address)).toBe(true);
  });

  it('leaves a Solana address unchanged', () => {
    const address = 'Hgw1pNJDYm5NbMheUHFNniiqtncor73swrH4RSN9APu5';

    expect(normalizeAddress(address)).toBe(address);
    expect(isValidAddress(address)).toBe(true);
  });

  it('leaves an unknown address format unchanged', () => {
    const address = 'custom-address';

    expect(normalizeAddress(address)).toBe(address);
    expect(isValidAddress(address)).toBe(false);
  });

  it('does not trim before normalization or validation', () => {
    const address = ' Hgw1pNJDYm5NbMheUHFNniiqtncor73swrH4RSN9APu5 ';

    expect(normalizeAddress(address)).toBe(address);
    expect(isValidAddress(address)).toBe(false);
  });

  it('preserves an undefined address', () => {
    expect(normalizeAddress(undefined)).toBeUndefined();
    expect(isValidAddress(undefined)).toBe(false);
  });
});

describe('addressesEqual', () => {
  it('does not match missing addresses', () => {
    expect(addressesEqual(undefined, undefined)).toBe(false);
    expect(addressesEqual(undefined, 'Hgw1pNJDYm5NbMheUHFNniiqtncor73swrH4RSN9APu5')).toBe(false);
  });

  it('compares EVM addresses case-insensitively', () => {
    expect(
      addressesEqual(
        '0x9481eF9e2CA814fc94676dEa3E8c3097B06b3a33',
        '0x9481ef9e2ca814fc94676dea3e8c3097b06b3a33',
      ),
    ).toBe(true);
  });

  it('compares Solana addresses case-sensitively', () => {
    expect(
      addressesEqual(
        'Hgw1pNJDYm5NbMheUHFNniiqtncor73swrH4RSN9APu5',
        'hgw1pNJDYm5NbMheUHFNniiqtncor73swrH4RSN9APu5',
      ),
    ).toBe(false);
  });

  it('does not ignore whitespace', () => {
    expect(
      addressesEqual(
        ' Hgw1pNJDYm5NbMheUHFNniiqtncor73swrH4RSN9APu5',
        'Hgw1pNJDYm5NbMheUHFNniiqtncor73swrH4RSN9APu5',
      ),
    ).toBe(false);
  });
});
