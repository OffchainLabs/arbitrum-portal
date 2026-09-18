import { type AccountType, getAccountType } from '../util/AccountUtils';
import { parseAddressForChain } from '../util/AddressUtils';
import type { WalletHandle } from '../wallet/types';

enum DestinationAddressWarnings {
  CONTRACT_ADDRESS = 'The destination address is a contract address. Please make sure it is the right address.',
}

/**
 * A cross-ecosystem transfer can't default to the sender's address,
 * so once the sender is connected it needs a recipient when no wallet is connected on the destination side.
 */
export function requiresRecipientAddress({
  sourceWallet,
  destinationWallet,
}: {
  sourceWallet: Pick<WalletHandle, 'ecosystem' | 'account'>;
  destinationWallet: Pick<WalletHandle, 'ecosystem' | 'account'>;
}): boolean {
  const isCrossEcosystem = sourceWallet.ecosystem !== destinationWallet.ecosystem;
  return isCrossEcosystem && !!sourceWallet.account.address && !destinationWallet.account.address;
}

export async function getDestinationAddressWarning({
  destinationAddress,
  accountType,
  destinationChainId,
}: {
  destinationAddress: string | undefined;
  accountType: AccountType | undefined;
  destinationChainId: number;
}) {
  // only externally owned senders are warned, smart contract wallets can send to contracts on purpose
  if (accountType !== 'externally-owned-account' && accountType !== 'delegated-account') {
    return null;
  }

  const parsedDestinationAddress = parseAddressForChain(destinationAddress, destinationChainId);
  if (!parsedDestinationAddress) {
    return null;
  }

  // EIP-7702 delegated addresses have code but are still EOAs
  const destinationAccountType = await getAccountType({
    address: parsedDestinationAddress,
    chainId: destinationChainId,
  });
  if (destinationAccountType === 'smart-contract-wallet') {
    return DestinationAddressWarnings.CONTRACT_ADDRESS;
  }

  // no warning
  return null;
}
