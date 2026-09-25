import { describe, expect, it } from 'vitest';

import { ChainId } from '../types/ChainId';
import {
  addressesEqual,
  isValidAddress,
  isValidAddressForChain,
  normalizeAddress,
} from './AddressUtils';

describe('EVM address compatibility', () => {
  it.each([
    ['lowercase', '0x52908400098527886e0f7030069857d2e4169ee7', true],
    ['checksum', '0x52908400098527886E0F7030069857D2E4169EE7', true],
    ['uppercase body', '0x27B1FDB04752BBC536007A920D24ACB045561C26', true],
    ['invalid mixed checksum', '0x52908400098527886e0F7030069857D2E4169EE7', false],
    ['unprefixed', '52908400098527886e0f7030069857d2e4169ee7', true],
    ['ICAP', 'XE65GB6LDNXYOFTX0NSV3FUWKOWIXAMJK36', true],
  ])('preserves validity for %s', (_, address, valid) => {
    expect(isValidAddress(address)).toBe(valid);
    expect(isValidAddressForChain(address, ChainId.ArbitrumOne)).toBe(valid);
    expect(normalizeAddress(address)).toBe(
      address.startsWith('0x') ? address.toLowerCase() : address,
    );
  });

  it('validates the original checksum before normalizing', () => {
    const address = '0x52908400098527886e0F7030069857D2E4169EE7';
    expect(isValidAddress(address)).toBe(false);
    expect(isValidAddress(normalizeAddress(address))).toBe(true);
  });
});

describe('destination compatibility', () => {
  const solana = 'Hgw1pNJDYm5NbMheUHFNniiqtncor73swrH4RSN9APu5';
  const evm = '0x52908400098527886e0f7030069857d2e4169ee7';

  it('rejects valid addresses from the wrong ecosystem', () => {
    expect(isValidAddressForChain(solana, ChainId.ArbitrumOne)).toBe(false);
    expect(isValidAddressForChain(evm, ChainId.Solana)).toBe(false);
    expect(isValidAddressForChain(solana, ChainId.Solana)).toBe(true);
  });

  it.each([undefined, '', '0OIl', '1'.repeat(31), '1'.repeat(33), ` ${solana}`])(
    'rejects malformed or missing addresses: %s',
    (address) => expect(isValidAddressForChain(address, ChainId.Solana)).toBe(false),
  );

  it('rejects unsupported destinations', () => {
    expect(isValidAddressForChain(evm, 999_999_999)).toBe(false);
    expect(isValidAddressForChain(solana, 999_999_999)).toBe(false);
  });
});

describe('normalizeAddress', () => {
  it('normalizes an EVM-shaped address', () => {
    const address = '0x9481eF9e2CA814fc94676dEa3E8c3097B06b3a33';

    expect(normalizeAddress(address)).toBe('0x9481ef9e2ca814fc94676dea3e8c3097b06b3a33');
    expect(isValidAddress(address)).toBe(true);
  });

  it('normalizes an EVM address with an uppercase prefix', () => {
    const address = '0X9481EF9E2CA814FC94676DEA3E8C3097B06B3A33';

    expect(normalizeAddress(address)).toBe('0x9481ef9e2ca814fc94676dea3e8c3097b06b3a33');
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
