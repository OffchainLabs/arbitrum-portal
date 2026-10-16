import { describe, expect, it, vi } from 'vitest';

import { ChainId } from '../../types/ChainId';
import { AccountType, getAccountType } from '../../util/AccountUtils';
import { getDestinationAddressWarning } from './CustomDestinationAddressInput';

vi.mock('../../util/AccountUtils', () => ({ getAccountType: vi.fn() }));

const destinationAddress = '0x9481eF9e2CA814fc94676dEa3E8c3097B06b3a33';

describe('getDestinationAddressWarning', () => {
  it.each([
    { destinationAccountType: 'smart-contract-wallet', warns: true },
    { destinationAccountType: 'delegated-account', warns: false },
    { destinationAccountType: 'externally-owned-account', warns: false },
  ] as const)(
    'warns an EOA sender about a $destinationAccountType destination: $warns',
    async ({ destinationAccountType, warns }) => {
      vi.mocked(getAccountType).mockResolvedValue(destinationAccountType);
      const senderAccountType: AccountType = 'externally-owned-account';
      const warning = await getDestinationAddressWarning({
        destinationAddress,
        accountType: senderAccountType,
        destinationChainId: ChainId.ArbitrumOne,
      });
      expect(warning !== null).toBe(warns);
      expect(getAccountType).toHaveBeenCalledWith({
        address: destinationAddress,
        chainId: ChainId.ArbitrumOne,
      });
    },
  );
});
