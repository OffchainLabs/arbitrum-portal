import { utils } from 'ethers';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ChainId } from '../types/ChainId';
import { getDestinationAddressWarning } from './destinationAddress';
import { addressIsSmartContract } from './evm/account';

vi.mock('./evm/account', () => ({
  addressIsSmartContract: vi.fn(),
}));

const evmAddress = '0x8ba1f109551bD432803012645Ac136ddd64DBA72';
const solanaAddress = 'Hgw1pNJDYm5NbMheUHFNniiqtncor73swrH4RSN9APu5';

describe.sequential('destination address warnings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(addressIsSmartContract).mockResolvedValue(true);
  });

  it.each([
    evmAddress,
    evmAddress.toLowerCase(),
    evmAddress.slice(2),
    utils.getIcapAddress(evmAddress),
  ])(
    'canonicalizes valid EVM input %s before inspecting the contract',
    async (destinationAddress) => {
      expect(
        await getDestinationAddressWarning({
          destinationAddress,
          destinationChainId: ChainId.Ethereum,
          accountType: 'externally-owned-account',
        }),
      ).toBe(
        'The destination address is a contract address. Please make sure it is the right address.',
      );
      expect(addressIsSmartContract).toHaveBeenCalledExactlyOnceWith(
        evmAddress.toLowerCase(),
        ChainId.Ethereum,
      );
    },
  );

  it.each([
    { destinationAddress: undefined, destinationChainId: ChainId.Ethereum },
    { destinationAddress: '', destinationChainId: ChainId.Ethereum },
    { destinationAddress: 'invalid', destinationChainId: ChainId.Ethereum },
    {
      destinationAddress: '0x8Ba1f109551bD432803012645Ac136ddd64DBA72',
      destinationChainId: ChainId.Ethereum,
    },
    { destinationAddress: solanaAddress, destinationChainId: ChainId.Ethereum },
    { destinationAddress: solanaAddress, destinationChainId: ChainId.Solana },
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
      expect(addressIsSmartContract).not.toHaveBeenCalled();
    },
  );

  it('warns delegated accounts about contract destinations', async () => {
    expect(
      await getDestinationAddressWarning({
        destinationAddress: evmAddress,
        destinationChainId: ChainId.Ethereum,
        accountType: 'delegated-account',
      }),
    ).toBe(
      'The destination address is a contract address. Please make sure it is the right address.',
    );
  });

  it('does not warn smart contract wallets about contract destinations', async () => {
    expect(
      await getDestinationAddressWarning({
        destinationAddress: evmAddress,
        destinationChainId: ChainId.Ethereum,
        accountType: 'smart-contract-wallet',
      }),
    ).toBeNull();
  });

  it('does not warn when the destination is not a contract', async () => {
    vi.mocked(addressIsSmartContract).mockResolvedValue(false);
    expect(
      await getDestinationAddressWarning({
        destinationAddress: evmAddress,
        destinationChainId: ChainId.Ethereum,
        accountType: 'externally-owned-account',
      }),
    ).toBeNull();
  });
});
