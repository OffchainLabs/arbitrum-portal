import { describe, expect, it } from 'vitest';

import { DestinationAddressErrors } from '../CustomDestinationAddressInput';
import { getDestinationAddressError } from './useDestinationAddressError';

describe('getDestinationAddressError', () => {
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
