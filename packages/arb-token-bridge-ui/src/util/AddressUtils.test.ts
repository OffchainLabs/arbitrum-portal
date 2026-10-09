import bs58 from 'bs58';
import { describe, expect, expectTypeOf, it, vi } from 'vitest';

import { ChainId } from '../types/ChainId';
import {
  type Address,
  type EvmAddress,
  type SolanaAddress,
  addressesEqual,
  isValidAddress,
  isValidSolanaAddress,
  normalizeAddress,
} from './AddressUtils';
import { isValidAddressForChain } from './isValidAddressForChain';

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
      valid && address.startsWith('0x') ? address.toLowerCase() : address,
    );
  });

  it.each(['0x', '0X'])('preserves an invalid checksum with prefix %s', (prefix) => {
    const address = `${prefix}52908400098527886e0F7030069857D2E4169EE7`;
    expect(isValidAddress(address)).toBe(false);
    expect(normalizeAddress(address)).toBe(address);
    expect(isValidAddress(normalizeAddress(address))).toBe(false);
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
  it('preserves a valid Solana address that also resembles unprefixed EVM hex', () => {
    const address = '1'.repeat(10) + 'A'.repeat(30);
    expect(bs58.decode(address)).toHaveLength(32);
    expect(isValidSolanaAddress(address)).toBe(true);
    expect(normalizeAddress(address)).toBe(address);
    expect(addressesEqual(address, address.toLowerCase())).toBe(false);
  });

  it('normalizes an EVM-shaped address', () => {
    const address = '0x9481eF9e2CA814fc94676dEa3E8c3097B06b3a33';

    expect(normalizeAddress(address)).toBe('0x9481ef9e2ca814fc94676dea3e8c3097b06b3a33');
    expect(isValidAddress(address)).toBe(true);
  });

  it.each([
    '0X9481EF9E2CA814FC94676DEA3E8C3097B06B3A33',
    '0X9481eF9e2CA814fc94676dEa3E8c3097B06b3a33',
  ])('normalizes an uppercase prefix before validating %s', (address) => {
    expect(normalizeAddress(address)).toBe('0x9481ef9e2ca814fc94676dea3e8c3097b06b3a33');
    expect(addressesEqual(address, address.toLowerCase())).toBe(true);
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

  it.each([
    ['EVM', '0x9481eF9e2CA814fc94676dEa3E8c3097B06b3a33'],
    ['Solana', 'Hgw1pNJDYm5NbMheUHFNniiqtncor73swrH4RSN9APu5'],
  ])('preserves surrounding whitespace for %s addresses', (_, address) => {
    expect(addressesEqual(` ${address}`, address)).toBe(false);
    expect(addressesEqual(address, `${address} `)).toBe(false);
  });

  it('does not match empty addresses', () => {
    expect(addressesEqual('', '')).toBe(false);
  });

  it.each(['0x', '0X'])(
    'does not normalize an invalid checksum with prefix %s for comparison',
    (prefix) => {
      const address = `${prefix}52908400098527886e0F7030069857D2E4169EE7`;
      expect(addressesEqual(address, address.toLowerCase())).toBe(false);
    },
  );
});

describe('address boundaries', () => {
  it('accepts Solana addresses as strings', () => {
    expectTypeOf<SolanaAddress>().toEqualTypeOf<string>();
    expectTypeOf<string>().toExtend<Address>();
    expectTypeOf<EvmAddress>().toExtend<Address>();
  });

  it('never decodes hex addresses or compares Solana addresses with base58', () => {
    const decode = vi.spyOn(bs58, 'decode');
    const hex = '0x9481eF9e2CA814fc94676dEa3E8c3097B06b3a33';
    normalizeAddress(hex);
    isValidAddressForChain(hex, ChainId.Solana);
    addressesEqual(hex, hex.toLowerCase());
    addressesEqual(
      'So11111111111111111111111111111111111111112',
      'So11111111111111111111111111111111111111112',
    );
    expect(decode).not.toHaveBeenCalled();
    decode.mockRestore();
  });
});
