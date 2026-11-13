import { describe, expect, it, vi } from 'vitest';

import type { WalletEcosystem } from '../../../wallet/types';
import { DestinationAddressErrors } from '../CustomDestinationAddressInput';
import { getDestinationAddressError } from './useDestinationAddressError';

const DENYLISTED_ADDRESS = '0x52908400098527886e0f7030069857d2e4169ee7';

vi.mock('../../../util/AddressUtils', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../util/AddressUtils')>()),
  // Keyed on the argument, so concurrent tests can't consume each other's mock values
  addressIsDenylisted: vi.fn(async (address: string) => address === DENYLISTED_ADDRESS),
}));
vi.mock('../../../wallet/ecosystems/solana', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../wallet/ecosystems/solana')>();
  actual.solanaEcosystem.isEnabled = () => true;
  return actual;
});

const SOLANA_ADDRESS = 'Hgw1pNJDYm5NbMheUHFNniiqtncor73swrH4RSN9APu5';

describe('getDestinationAddressError', () => {
  it.each<[string, string, WalletEcosystem, DestinationAddressErrors | null]>([
    ['lowercase EVM', '0x1111111111111111111111111111111111111111', 'evm', null],
    ['checksummed EVM', '0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed', 'evm', null],
    [
      'EVM with a bad checksum',
      '0x52908400098527886e0F7030069857D2E4169EE7',
      'evm',
      DestinationAddressErrors.INVALID_ADDRESS,
    ],
    [
      'unprefixed EVM hex',
      '1111111111111111111111111111111111111111',
      'evm',
      DestinationAddressErrors.INVALID_ADDRESS,
    ],
    ['Solana on an EVM chain', SOLANA_ADDRESS, 'evm', DestinationAddressErrors.INVALID_ADDRESS],
    ['Solana', SOLANA_ADDRESS, 'solana', null],
    [
      'EVM on Solana',
      '0x1111111111111111111111111111111111111111',
      'solana',
      DestinationAddressErrors.INVALID_ADDRESS,
    ],
    [
      'checksummed denylisted EVM',
      '0x52908400098527886E0F7030069857D2E4169EE7',
      'evm',
      DestinationAddressErrors.DENYLISTED_ADDRESS,
    ],
  ])('%s', async (_, destinationAddress, destinationEcosystem, expected) => {
    expect(
      await getDestinationAddressError({
        destinationAddress,
        isSenderSmartContractWallet: false,
        isRecipientAddressRequired: false,
        destinationEcosystem,
      }),
    ).toBe(expected);
  });

  it.each([
    {
      isSenderSmartContractWallet: true,
      isRecipientAddressRequired: false,
      expected: DestinationAddressErrors.REQUIRED_ADDRESS,
    },
    {
      isSenderSmartContractWallet: false,
      isRecipientAddressRequired: true,
      expected: DestinationAddressErrors.REQUIRED_ADDRESS,
    },
    { isSenderSmartContractWallet: false, isRecipientAddressRequired: false, expected: null },
  ])(
    'returns $expected without an address (smart contract wallet: $isSenderSmartContractWallet, recipient required: $isRecipientAddressRequired)',
    async ({ expected, ...params }) => {
      expect(await getDestinationAddressError({ ...params, destinationEcosystem: 'evm' })).toBe(
        expected,
      );
    },
  );
});
