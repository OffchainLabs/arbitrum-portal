import useSWRImmutable from 'swr/immutable';

import { useAccountType } from '../../../hooks/useAccountType';
import { useArbQueryParams } from '../../../hooks/useArbQueryParams';
import { useNetworks } from '../../../hooks/useNetworks';
import { addressIsDenylisted } from '../../../util/AddressUtils';
import { ecosystems } from '../../../wallet/ecosystems';
import { getWalletEcosystem } from '../../../wallet/getWalletEcosystem';
import { useWallets } from '../../../wallet/hooks/useWallets';
import type { WalletEcosystem } from '../../../wallet/types';
import { DestinationAddressErrors } from '../CustomDestinationAddressInput';

export async function getDestinationAddressError({
  destinationAddress,
  isSenderSmartContractWallet,
  destinationEcosystem,
}: {
  destinationAddress?: string;
  isSenderSmartContractWallet: boolean;
  destinationEcosystem: WalletEcosystem;
}): Promise<DestinationAddressErrors | null> {
  if (!destinationAddress && isSenderSmartContractWallet) {
    // destination address required for contract wallets
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
  const {
    sourceWallet: {
      account: { address },
    },
  } = useWallets();
  const { accountType } = useAccountType();
  const isSenderSmartContractWallet = accountType === 'smart-contract-wallet';

  const { data: destinationAddressError } = useSWRImmutable(
    [
      address?.toLowerCase(),
      destinationAddress ?? destinationAddressFromQueryParams,
      isSenderSmartContractWallet,
      // Same validation for every chain of an ecosystem, so switching between them reuses the result
      getWalletEcosystem(destinationChain.id),
      'useDestinationAddressError',
    ] as const,
    ([, _destinationAddress, _isSenderSmartContractWallet, destinationEcosystem]) =>
      getDestinationAddressError({
        destinationAddress: _destinationAddress,
        isSenderSmartContractWallet: _isSenderSmartContractWallet,
        destinationEcosystem,
      }),
  );

  return { destinationAddressError };
}
