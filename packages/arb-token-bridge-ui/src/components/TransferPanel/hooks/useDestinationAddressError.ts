import { isAddress } from 'ethers/lib/utils';
import useSWRImmutable from 'swr/immutable';
import { useAccount } from 'wagmi';

import { useAccountType } from '../../../hooks/useAccountType';
import { useArbQueryParams } from '../../../hooks/useArbQueryParams';
import { addressIsDenylisted } from '../../../util/AddressUtils';
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
  const { address } = useAccount();
  const { accountType } = useAccountType();
  const isSenderSmartContractWallet = accountType === 'smart-contract-wallet';

  const { data: destinationAddressError } = useSWRImmutable(
    [
      address?.toLowerCase(),
      (destinationAddress ?? destinationAddressFromQueryParams)?.toLowerCase(),
      isSenderSmartContractWallet,
      'useDestinationAddressError',
    ] as const,
    // Extracts the first element of the query key as the fetcher param
    ([, _destinationAddress, _isSenderSmartContractWallet]) =>
      getDestinationAddressError({
        destinationAddress: _destinationAddress,
        isSenderSmartContractWallet: _isSenderSmartContractWallet,
      }),
  );

  return { destinationAddressError };
}
