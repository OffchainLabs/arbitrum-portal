import useSWRImmutable from 'swr/immutable';

import { useAccountType } from '../../../hooks/useAccountType';
import { useArbQueryParams } from '../../../hooks/useArbQueryParams';
import { useNetworks } from '../../../hooks/useNetworks';
import { addressIsDenylisted } from '../../../services/denylist';
import { isValidAddressForChain, normalizeAddress } from '../../../util/AddressUtils';
import { useWallets } from '../../../wallet/hooks/useWallets';
import { DestinationAddressErrors } from '../CustomDestinationAddressInput';

export async function getDestinationAddressError({
  destinationAddress,
  isSenderSmartContractWallet,
  destinationChainId,
}: {
  destinationAddress?: string;
  isSenderSmartContractWallet: boolean;
  destinationChainId: number;
}): Promise<DestinationAddressErrors | null> {
  if (!destinationAddress && isSenderSmartContractWallet) {
    // destination address required for contract wallets
    return DestinationAddressErrors.REQUIRED_ADDRESS;
  }
  if (!destinationAddress) {
    return null;
  }
  if (!isValidAddressForChain(destinationAddress, destinationChainId)) {
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
  const [{ destinationChain }] = useNetworks();
  const { sourceWallet } = useWallets();
  const { accountType } = useAccountType();
  const isSenderSmartContractWallet = accountType === 'smart-contract-wallet';

  const { data: destinationAddressError } = useSWRImmutable(
    [
      normalizeAddress(sourceWallet.account.address),
      destinationAddress ?? destinationAddressFromQueryParams,
      isSenderSmartContractWallet,
      destinationChain.id,
      'useDestinationAddressError',
    ] as const,
    ([, _destinationAddress, _isSenderSmartContractWallet, destinationChainId]) =>
      getDestinationAddressError({
        destinationAddress: _destinationAddress,
        isSenderSmartContractWallet: _isSenderSmartContractWallet,
        destinationChainId,
      }),
  );

  return { destinationAddressError };
}
