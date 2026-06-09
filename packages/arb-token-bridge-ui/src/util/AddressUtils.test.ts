import { describe, expect, it } from 'vitest';

import { addressesEqual } from './AddressUtils';

describe('addressesEqual', () => {
  it('normalizes EVM addresses before comparing', () => {
    expect(
      addressesEqual(
        ' 0x9481eF9e2CA814fc94676dEa3E8c3097B06b3a33 ',
        '0x9481ef9e2ca814fc94676dea3e8c3097b06b3a33',
      ),
    ).toBe(true);
  });

  it('preserves case for Solana addresses', () => {
    expect(
      addressesEqual(
        'Hgw1pNJDYm5NbMheUHFNniiqtncor73swrH4RSN9APu5',
        'hgw1pNJDYm5NbMheUHFNniiqtncor73swrH4RSN9APu5',
      ),
    ).toBe(false);
  });

  it('returns false when address1 does not resolve to a known adapter', () => {
    expect(addressesEqual('custom-address', 'custom-address')).toBe(false);
  });
});
