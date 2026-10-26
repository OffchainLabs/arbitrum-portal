import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ChainId } from '../types/ChainId';
import { getAccountType } from '../util/AccountUtils';
import type { WalletHandle } from '../wallet/types';
import { getDestinationAddressWarning, requiresRecipientAddress } from './destinationAddress';

vi.mock('../util/AccountUtils', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../util/AccountUtils')>()),
  getAccountType: vi.fn(),
}));

const flags = vi.hoisted(() => ({ solana: true }));
vi.mock('../wallet/ecosystems/solana', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../wallet/ecosystems/solana')>();
  actual.solanaEcosystem.isEnabled = () => flags.solana;
  return actual;
});

const evmAddress = '0x8ba1f109551bD432803012645Ac136ddd64DBA72';
const solanaAddress = 'Hgw1pNJDYm5NbMheUHFNniiqtncor73swrH4RSN9APu5';
const contractWarning =
  'The destination address is a contract address. Please make sure it is the right address.';

describe.sequential('destination address warnings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    flags.solana = true;
    vi.mocked(getAccountType).mockResolvedValue('smart-contract-wallet');
  });

  it.each([evmAddress, evmAddress.toLowerCase(), '0x8Ba1f109551bD432803012645Ac136ddd64DBA72'])(
    'inspects EVM input %s as the lowercased address',
    async (destinationAddress) => {
      expect(
        await getDestinationAddressWarning({
          destinationAddress,
          destinationChainId: ChainId.Ethereum,
          accountType: 'externally-owned-account',
        }),
      ).toBe(contractWarning);
      expect(getAccountType).toHaveBeenCalledExactlyOnceWith({
        address: evmAddress.toLowerCase(),
        chainId: ChainId.Ethereum,
      });
    },
  );

  it.each([
    { destinationAddress: undefined, destinationChainId: ChainId.Ethereum },
    { destinationAddress: '', destinationChainId: ChainId.Ethereum },
    { destinationAddress: 'invalid', destinationChainId: ChainId.Ethereum },
    { destinationAddress: solanaAddress, destinationChainId: ChainId.Ethereum },
    { destinationAddress: evmAddress, destinationChainId: ChainId.Solana },
    { destinationAddress: evmAddress, destinationChainId: -1 },
  ])(
    'skips EVM inspection for $destinationAddress on chain $destinationChainId',
    async (destination) => {
      expect(
        await getDestinationAddressWarning({
          ...destination,
          accountType: 'externally-owned-account',
        }),
      ).toBeNull();
      expect(getAccountType).not.toHaveBeenCalled();
    },
  );

  it('skips a Solana destination while Solana is disabled', async () => {
    flags.solana = false;
    expect(
      await getDestinationAddressWarning({
        destinationAddress: solanaAddress,
        destinationChainId: ChainId.Solana,
        accountType: 'externally-owned-account',
      }),
    ).toBeNull();
    expect(getAccountType).not.toHaveBeenCalled();
  });

  it('does not warn about a Solana destination while Solana is enabled', async () => {
    // The Solana probe classifies every valid address as externally owned
    vi.mocked(getAccountType).mockResolvedValue('externally-owned-account');
    expect(
      await getDestinationAddressWarning({
        destinationAddress: solanaAddress,
        destinationChainId: ChainId.Solana,
        accountType: 'externally-owned-account',
      }),
    ).toBeNull();
    expect(getAccountType).toHaveBeenCalledExactlyOnceWith({
      address: solanaAddress,
      chainId: ChainId.Solana,
    });
  });

  it('warns delegated senders about contract destinations', async () => {
    expect(
      await getDestinationAddressWarning({
        destinationAddress: evmAddress,
        destinationChainId: ChainId.Ethereum,
        accountType: 'delegated-account',
      }),
    ).toBe(contractWarning);
  });

  it('does not warn while the sender account type is unknown', async () => {
    expect(
      await getDestinationAddressWarning({
        destinationAddress: evmAddress,
        destinationChainId: ChainId.Ethereum,
        accountType: undefined,
      }),
    ).toBeNull();
    expect(getAccountType).not.toHaveBeenCalled();
  });

  it('does not warn smart contract wallets about contract destinations', async () => {
    expect(
      await getDestinationAddressWarning({
        destinationAddress: evmAddress,
        destinationChainId: ChainId.Ethereum,
        accountType: 'smart-contract-wallet',
      }),
    ).toBeNull();
    expect(getAccountType).not.toHaveBeenCalled();
  });

  // EIP-7702 delegated accounts have code but are still EOAs
  it.each(['externally-owned-account', 'delegated-account', undefined] as const)(
    'does not warn when the destination is %s',
    async (destinationAccountType) => {
      vi.mocked(getAccountType).mockResolvedValue(destinationAccountType);
      expect(
        await getDestinationAddressWarning({
          destinationAddress: evmAddress,
          destinationChainId: ChainId.Ethereum,
          accountType: 'externally-owned-account',
        }),
      ).toBeNull();
    },
  );
});

describe('requiresRecipientAddress', () => {
  it.each([
    {
      source: 'solana',
      destination: 'evm',
      sender: solanaAddress,
      address: undefined,
      expected: true,
    },
    {
      source: 'solana',
      destination: 'evm',
      sender: undefined,
      address: undefined,
      expected: false,
    },
    {
      source: 'solana',
      destination: 'evm',
      sender: solanaAddress,
      address: evmAddress,
      expected: false,
    },
    { source: 'evm', destination: 'evm', sender: evmAddress, address: undefined, expected: false },
  ] as const)(
    '$source → $destination with sender $sender and destination wallet $address: $expected',
    ({ source, destination, sender, address, expected }) => {
      expect(
        requiresRecipientAddress({
          sourceWallet: {
            ecosystem: source,
            account: {
              ecosystem: source,
              address: sender,
              status: 'connected',
            } as WalletHandle['account'],
          },
          destinationWallet: {
            ecosystem: destination,
            account: { ecosystem: destination, address, status: 'connected' },
          },
        }),
      ).toBe(expected);
    },
  );
});
