import bs58 from 'bs58';
import { describe, expect, it, vi } from 'vitest';

import { ChainId } from '../types/ChainId';
import { ecosystems } from '../wallet/ecosystems';
import { isValidSolanaAddress } from '../wallet/ecosystems/solana';
import { addressesEqual } from './AddressEquality';
import {
  isValidAddress,
  isValidAddressForChain,
  normalizeAddress,
  parseAddressForChain,
} from './AddressUtils';

vi.mock('../wallet/ecosystems/solana', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../wallet/ecosystems/solana')>();
  actual.solanaEcosystem.isEnabled = () => true;
  return actual;
});

describe('EVM address validation', () => {
  it.each([
    ['lowercase', '0x52908400098527886e0f7030069857d2e4169ee7', true],
    ['checksum', '0x52908400098527886E0F7030069857D2E4169EE7', true],
    ['uppercase body', '0x27B1FDB04752BBC536007A920D24ACB045561C26', false],
    ['invalid mixed checksum', '0x52908400098527886e0F7030069857D2E4169EE7', false],
    ['unprefixed', '52908400098527886e0f7030069857d2e4169ee7', false],
    ['ICAP', 'XE65GB6LDNXYOFTX0NSV3FUWKOWIXAMJK36', false],
  ])('validates %s', (_, address, valid) => {
    expect(isValidAddress(address)).toBe(valid);
    expect(isValidAddressForChain(address, ChainId.ArbitrumOne)).toBe(valid);
    // any 0x-prefixed hex address is lowercased, whatever its checksum
    expect(normalizeAddress(address)).toBe(
      /^0x[0-9a-f]{40}$/i.test(address) ? address.toLowerCase() : address,
    );
  });

  it.each(['0x', '0X'])('lowercases an invalid checksum with prefix %s', (prefix) => {
    const address = `${prefix}52908400098527886e0F7030069857D2E4169EE7`;
    expect(isValidAddress(address)).toBe(false);
    expect(normalizeAddress(address)).toBe(address.toLowerCase());
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
  it('preserves a valid Solana address that also resembles unprefixed EVM hex', () => {
    const address = '1'.repeat(10) + 'A'.repeat(30);
    expect(bs58.decode(address)).toHaveLength(32);
    expect(isValidSolanaAddress(address)).toBe(true);
    expect(normalizeAddress(address)).toBe(address);
  });

  it('normalizes an EVM-shaped address', () => {
    const address = '0x9481eF9e2CA814fc94676dEa3E8c3097B06b3a33';

    expect(normalizeAddress(address)).toBe('0x9481ef9e2ca814fc94676dea3e8c3097b06b3a33');
    expect(isValidAddress(address)).toBe(true);
  });

  it.each([
    '0X9481EF9E2CA814FC94676DEA3E8C3097B06B3A33',
    '0X9481eF9e2CA814fc94676dEa3E8c3097B06b3a33',
  ])('lowercases an uppercase 0X prefix %s', (address) => {
    expect(isValidAddress(address)).toBe(false);
    expect(normalizeAddress(address)).toBe(address.toLowerCase());
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

describe('parseAddressForChain', () => {
  const solana = 'Hgw1pNJDYm5NbMheUHFNniiqtncor73swrH4RSN9APu5';

  it.each([
    ['checksum', '0x9481eF9e2CA814fc94676dEa3E8c3097B06b3a33'],
    ['invalid checksum', '0x52908400098527886e0F7030069857D2E4169EE7'],
    ['uppercase prefix', '0X9481EF9E2CA814FC94676DEA3E8C3097B06B3A33'],
  ])('lowercases an EVM address with %s', (_, address) => {
    expect(parseAddressForChain(address, ChainId.ArbitrumOne)).toBe(address.toLowerCase());
  });

  it('keeps Solana address case', () => {
    expect(parseAddressForChain(solana, ChainId.Solana)).toBe(solana);
    expect(parseAddressForChain(solana.toLowerCase(), ChainId.Solana)).toBeUndefined();
  });

  it.each([
    [solana, ChainId.ArbitrumOne],
    ['0x9481eF9e2CA814fc94676dEa3E8c3097B06b3a33', ChainId.Solana],
    ['0x9481eF9e2CA814fc94676dEa3E8c3097B06b3a33', 999_999_999],
    [undefined, ChainId.ArbitrumOne],
  ])('rejects %s on chain %s', (address, chainId) => {
    expect(parseAddressForChain(address, chainId)).toBeUndefined();
  });
});

describe('address boundaries', () => {
  it('never decodes hex addresses with base58', () => {
    const decode = vi.spyOn(bs58, 'decode');
    const hex = '0x9481eF9e2CA814fc94676dEa3E8c3097B06b3a33';
    normalizeAddress(hex);
    isValidAddressForChain(hex, ChainId.Solana);
    expect(decode).not.toHaveBeenCalled();
    decode.mockRestore();
  });
});

describe('addressesEqual', () => {
  it('compares EVM addresses case-insensitively', () => {
    expect(
      addressesEqual(
        '0x52908400098527886E0F7030069857D2E4169EE7',
        ' 0x52908400098527886e0f7030069857d2e4169ee7',
      ),
    ).toBe(true);
  });

  it('compares Solana addresses case-sensitively', () => {
    const address = 'Hgw1pNJDYm5NbMheUHFNniiqtncor73swrH4RSN9APu5';
    const caseVariant = 'Hgw1pNJDYm5NbMheUHFNniiqtncor73swrH4RSN9APU5';
    expect(isValidSolanaAddress(caseVariant)).toBe(true);
    expect(addressesEqual(address, ` ${address}`)).toBe(true);
    expect(addressesEqual(address, caseVariant)).toBe(false);
  });

  it('compares unknown formats case-insensitively', () => {
    expect(addressesEqual('ETH', 'eth')).toBe(true);
    expect(addressesEqual(undefined, undefined)).toBe(true);
    expect(addressesEqual('', undefined)).toBe(false);
  });
});

describe('Solana feature flag', () => {
  const address = 'Hgw1pNJDYm5NbMheUHFNniiqtncor73swrH4RSN9APu5';

  it('rejects Solana addresses while Solana is disabled, unless the flag is ignored', () => {
    const isEnabled = vi.spyOn(ecosystems.solana, 'isEnabled').mockReturnValue(false);
    try {
      expect(isValidAddress(address)).toBe(false);
      expect(isValidAddressForChain(address, ChainId.Solana)).toBe(false);
      expect(isValidAddress(address, { ignoreFeatureFlag: true })).toBe(true);
      // case sensitivity comes from the format, not the flag
      expect(addressesEqual(address, address.replace('u5', 'U5'))).toBe(false);
    } finally {
      isEnabled.mockRestore();
    }
  });
});
