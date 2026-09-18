import useSWRImmutable from 'swr/immutable';

import { useAccountType } from '../../../hooks/useAccountType';
import { useArbQueryParams } from '../../../hooks/useArbQueryParams';
import { useNetworks } from '../../../hooks/useNetworks';
import { requiresRecipientAddress } from '../../../services/destinationAddress';
import { addressIsDenylisted } from '../../../util/AddressUtils';
import { ecosystems } from '../../../wallet/ecosystems';
import { getWalletEcosystem } from '../../../wallet/getWalletEcosystem';
import { useWallets } from '../../../wallet/hooks/useWallets';
import type { WalletEcosystem } from '../../../wallet/types';
import { DestinationAddressErrors } from '../CustomDestinationAddressInput';

export async function getDestinationAddressError({
  destinationAddress,
  isSenderSmartContractWallet,
  isRecipientAddressRequired,
  destinationEcosystem,
}: {
  destinationAddress?: string;
  isSenderSmartContractWallet: boolean;
  isRecipientAddressRequired: boolean;
  destinationEcosystem: WalletEcosystem;
}): Promise<DestinationAddressErrors | null> {
  if (!destinationAddress && (isSenderSmartContractWallet || isRecipientAddressRequired)) {
    // required for contract wallets, and for cross-ecosystem transfers with no destination wallet
    return DestinationAddressErrors.REQUIRED_ADDRESS;
  }
  if (!destinationAddress) {
    return null;
  }
  const { address: addressAdapter } = ecosystems[destinationEcosystem];
  const parsedDestinationAddress = addressAdapter.normalize(destinationAddress);
  if (!addressAdapter.isValid(parsedDestinationAddress)) {
    return DestinationAddressErrors.INVALID_ADDRESS;
  }
  if (await addressIsDenylisted(parsedDestinationAddress)) {
    return DestinationAddressErrors.DENYLISTED_ADDRESS;
  }

  // no error
  return null;
}

export function useDestinationAddressError(destinationAddress?: string) {
  const [{ destinationAddress: destinationAddressFromQueryParams }] = useArbQueryParams();
  const [{ destinationChain }] = useNetworks();
  const { sourceWallet, destinationWallet } = useWallets();
  const { accountType } = useAccountType();
  const isSenderSmartContractWallet = accountType === 'smart-contract-wallet';
  const isRecipientAddressRequired = requiresRecipientAddress({ sourceWallet, destinationWallet });

  const { data: destinationAddressError } = useSWRImmutable(
    [
      sourceWallet.account.address?.toLowerCase(),
      destinationAddress ?? destinationAddressFromQueryParams,
      isSenderSmartContractWallet,
      isRecipientAddressRequired,
      // Same validation for every chain of an ecosystem, so switching between them reuses the result
      getWalletEcosystem(destinationChain.id),
      'useDestinationAddressError',
    ] as const,
    ([
      ,
      _destinationAddress,
      _isSenderSmartContractWallet,
      _isRecipientAddressRequired,
      destinationEcosystem,
    ]) =>
      getDestinationAddressError({
        destinationAddress: _destinationAddress,
        isSenderSmartContractWallet: _isSenderSmartContractWallet,
        isRecipientAddressRequired: _isRecipientAddressRequired,
        destinationEcosystem,
      }),
  );

  return { destinationAddressError };
}
