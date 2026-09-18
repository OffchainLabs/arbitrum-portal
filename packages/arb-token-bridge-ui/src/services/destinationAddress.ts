import type { AccountType } from '../util/AccountUtils';
import { isValidAddressForChain } from '../util/AddressUtils';
import { getWalletEcosystem } from '../wallet/getWalletEcosystem';

enum DestinationAddressWarnings {
  CONTRACT_ADDRESS = 'The destination address is a contract address. Please make sure it is the right address.',
}

export async function getDestinationAddressWarning({
  destinationAddress,
  accountType,
  destinationChainId,
}: {
  destinationAddress: string | undefined;
  accountType: AccountType;
  destinationChainId: number;
}) {
  if (!destinationAddress) {
    return null;
  }

  if (
    !isValidAddressForChain(destinationAddress, destinationChainId) ||
    getWalletEcosystem(destinationChainId) !== 'evm'
  ) {
    return null;
  }

  const { addressIsSmartContract } = await import('./evm/account');
  const destinationIsSmartContract = await addressIsSmartContract(
    destinationAddress,
    destinationChainId,
  );

  // checks if trying to send to a contract address, only checks EOA
  if (
    (accountType === 'externally-owned-account' || accountType === 'delegated-account') &&
    destinationIsSmartContract
  ) {
    return DestinationAddressWarnings.CONTRACT_ADDRESS;
  }

  // no warning
  return null;
}
