import { describe, expect, it } from 'vitest';

import { AddressAdapter, addressesEqual } from './addressEcosystem';

describe('AddressAdapter', () => {
  it('normalizes an EVM-shaped address', () => {
    const adapter = new AddressAdapter('0x9481eF9e2CA814fc94676dEa3E8c3097B06b3a33');

    expect(adapter.normalize()).toBe('0x9481ef9e2ca814fc94676dea3e8c3097b06b3a33');
    expect(adapter.isValidAddress()).toBe(true);
  });

  it('leaves a Solana address unchanged', () => {
    const address = 'Hgw1pNJDYm5NbMheUHFNniiqtncor73swrH4RSN9APu5';
    const adapter = new AddressAdapter(address);

    expect(adapter.normalize()).toBe(address);
    expect(adapter.isValidAddress()).toBe(true);
  });

  it('leaves an unknown address format unchanged', () => {
    const adapter = new AddressAdapter('custom-address');

    expect(adapter.normalize()).toBe('custom-address');
    expect(adapter.isValidAddress()).toBe(false);
  });

  it('does not trim before normalization or validation', () => {
    const address = ' Hgw1pNJDYm5NbMheUHFNniiqtncor73swrH4RSN9APu5 ';
    const adapter = new AddressAdapter(address);

    expect(adapter.normalize()).toBe(address);
    expect(adapter.isValidAddress()).toBe(false);
  });
});

describe('addressesEqual', () => {
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
