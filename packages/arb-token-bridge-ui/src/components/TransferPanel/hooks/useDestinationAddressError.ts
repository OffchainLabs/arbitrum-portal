import { isAddress } from 'ethers/lib/utils';
import useSWRImmutable from 'swr/immutable';

import { useAccountType } from '../../../hooks/useAccountType';
import { useArbQueryParams } from '../../../hooks/useArbQueryParams';
import { addressIsDenylisted } from '../../../util/AddressNetworkUtils';
import { normalizeAddress } from '../../../util/AddressUtils';
import { useWallets } from '../../../wallet/hooks/useWallets';
import { DestinationAddressErrors } from '../CustomDestinationAddressInput';

export async function getDestinationAddressError({
  destinationAddress,
  isSenderSmartContractWallet,
}: {
  destinationAddress?: string;
  isSenderSmartContractWallet: boolean;
}): Promise<DestinationAddressErrors | null> {
  if (!destinationAddress && isSenderSmartContractWallet) {
    // destination address required for contract wallets
    return DestinationAddressErrors.REQUIRED_ADDRESS;
  }
  if (!destinationAddress) {
    return null;
  }
  if (!isAddress(destinationAddress)) {
    return DestinationAddressErrors.INVALID_ADDRESS;
  }
  if (await addressIsDenylisted(destinationAddress)) {
    return DestinationAddressErrors.DENYLISTED_ADDRESS;
  }

  // no error
  return null;
}

export function useDestinationAddressError(destinationAddress?: string) {
  const [{ destinationAddress: destinationAddressFromQueryParams }] = useArbQueryParams();
  const { sourceWallet } = useWallets();
  const { accountType } = useAccountType();
  const isSenderSmartContractWallet = accountType === 'smart-contract-wallet';

  const { data: destinationAddressError } = useSWRImmutable(
    [
      normalizeAddress(sourceWallet.account.address),
      destinationAddress ?? destinationAddressFromQueryParams,
      isSenderSmartContractWallet,
      'useDestinationAddressError',
    ] as const,
    ([, _destinationAddress, _isSenderSmartContractWallet]) =>
      getDestinationAddressError({
        destinationAddress: _destinationAddress,
        isSenderSmartContractWallet: _isSenderSmartContractWallet,
      }),
  );

  return { destinationAddressError };
}
