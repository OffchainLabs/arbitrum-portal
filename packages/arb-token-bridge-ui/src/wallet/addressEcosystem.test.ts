import { describe, expect, it } from 'vitest';

import { AddressAdapter } from './addressEcosystem';

describe('AddressAdapter', () => {
  it('normalizes a valid EVM address', () => {
    const adapter = new AddressAdapter(' 0x9481eF9e2CA814fc94676dEa3E8c3097B06b3a33 ');

    expect(adapter.isValid()).toBe(true);
    expect(adapter.normalize()).toBe('0x9481ef9e2ca814fc94676dea3e8c3097b06b3a33');
  });

  it('normalizes a valid Solana address', () => {
    const address = 'Hgw1pNJDYm5NbMheUHFNniiqtncor73swrH4RSN9APu5';
    const adapter = new AddressAdapter(` ${address} `);

    expect(adapter.isValid()).toBe(true);
    expect(adapter.normalize()).toBe(address);
  });

  it('rejects an unknown address format', () => {
    const adapter = new AddressAdapter('custom-address');

    expect(adapter.isValid()).toBe(false);
    expect(adapter.normalize()).toBeUndefined();
  });
});
